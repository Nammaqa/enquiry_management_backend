const { User, OTP } = require('../../models');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signToken } = require('../../config/jwt');
const { generateOTP, sendOTPViaSMS } = require('../../utils/otp');

exports.signup = async (req, res) => {
  try {
    const { fullName, phone_number, email, password } = req.body;

    // Validate required fields
    if (!fullName || !phone_number || !email || !password) {
      return res.status(400).json({
        message: 'All fields (fullName, phone_number, email, password) are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        message: 'Email already exists',
      });
    }

    // Check if phone number already exists
    const existingPhone = await User.findOne({ where: { phone_number } });
    if (existingPhone) {
      return res.status(409).json({
        message: 'Phone number already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create User account
    try {
      const newUser = await User.create({
        name: fullName,
        email,
        phone_number,
        password: hashedPassword,
        role: 'user',
      });

      // Generate OTP
      const otpCode = generateOTP();

      // Set OTP expiration time (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete any existing OTP for this phone/email
      try {
        await OTP.destroy({ where: { phone_number } });
      } catch (err) {
        console.error('Error deleting old OTP:', err.message);
      }

      // Save OTP to database with userId reference
      const otpRecord = await OTP.create({
        userId: newUser.id,
        email,
        phone_number,
        fullName,
        password: hashedPassword, // Store hashed password temporarily
        otp_code: otpCode,
        is_verified: false,
        expires_at: expiresAt,
      });

      // Send OTP via SMS
      const smsResult = await sendOTPViaSMS(phone_number, otpCode);

      if (!smsResult.success) {
        return res.status(500).json({
          message: 'Failed to send OTP',
          error: smsResult.error,
        });
      }

      // Return with user details including ID
      return res.status(200).json({
        message: 'OTP sent successfully to your phone',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone_number: newUser.phone_number,
          role: newUser.role,
        },
        reference_id: otpRecord.id,
        expiresIn: '10 minutes',
        next: 'Verify OTP using /api/mobile/auth/verify-otp endpoint',
      });
    } catch (err) {
      console.error('Error in signup process:', err.message);
      return res.status(500).json({
        message: 'Failed to complete signup',
        error: err.message,
      });
    }
  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { user_id, phone_number, otp_code } = req.body;

    // Validate required fields
    if (!user_id || !phone_number || !otp_code) {
      return res.status(400).json({
        message: 'user_id, phone_number, and otp_code are required',
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      where: { userId: user_id, phone_number, otp_code },
    });

    if (!otpRecord) {
      return res.status(401).json({
        message: 'Invalid OTP or user credentials',
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expires_at) {
      return res.status(401).json({
        message: 'OTP has expired. Please resend OTP.',
      });
    }

    // Check if OTP is already verified
    if (otpRecord.is_verified) {
      return res.status(400).json({
        message: 'OTP already used',
      });
    }

    // Find user
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Mark OTP as verified
    otpRecord.is_verified = true;
    await otpRecord.save();

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
    });

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.resendSignupOTP = async (req, res) => {
  try {
    const { user_id, phone_number } = req.body;

    // Validate required fields
    if (!user_id || !phone_number) {
      return res.status(400).json({
        message: 'user_id and phone_number are required',
      });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Verify phone number matches user's phone
    if (user.phone_number !== phone_number) {
      return res.status(400).json({
        message: 'Phone number does not match user account',
      });
    }

    // Find existing OTP record
    const existingOTP = await OTP.findOne({ where: { userId: user_id, phone_number } });
    if (!existingOTP) {
      return res.status(404).json({
        message: 'No pending OTP found for this user and phone number',
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();

    // Set OTP expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update OTP with new code
    try {
      await OTP.update(
        {
          otp_code: otpCode,
          is_verified: false,
          expires_at: expiresAt,
        },
        { where: { phone_number } }
      );
    } catch (err) {
      console.error('Error updating OTP:', err.message);
      return res.status(500).json({
        message: 'Failed to update OTP record',
        error: err.message,
      });
    }

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(phone_number, otpCode);

    if (!smsResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP',
        error: smsResult.error,
      });
    }

    return res.status(200).json({
      message: 'OTP resent successfully to your phone',
      data: {
        phone_number,
      },
      expiresIn: '10 minutes',
      next: 'Verify OTP using /api/mobile/auth/verify-otp endpoint',
    });
  } catch (error) {
    console.error('Resend signup OTP error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.sendLoginOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // Validate required fields
    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required',
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Generate OTP
    const otpCode = generateOTP();

    // Set OTP expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone and create new one
    try {
      await OTP.destroy({ where: { phone_number } });
    } catch (err) {
      console.error('Error deleting old OTP:', err.message);
    }

    // Save OTP to database with userId
    try {
      await OTP.create({
        userId: user.id,
        email: user.email,
        phone_number,
        otp_code: otpCode,
        is_verified: false,
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error('Error creating login OTP:', err.message);
      return res.status(500).json({
        message: 'Failed to create OTP record',
        error: err.message,
      });
    }

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(phone_number, otpCode);

    if (!smsResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP',
        error: smsResult.error,
      });
    }

    return res.status(200).json({
      message: 'OTP sent successfully to your phone',
      data: {
        phone_number,
      },
      expiresIn: '10 minutes',
      next: 'Use the OTP with phone_number to login',
    });
  } catch (error) {
    console.error('Send login OTP error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.resendLoginOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    // Validate required fields
    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required',
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();

    // Set OTP expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    try {
      await OTP.destroy({ where: { phone_number } });
    } catch (err) {
      console.error('Error deleting old OTP:', err.message);
    }

    // Save new OTP to database with userId
    try {
      await OTP.create({
        userId: user.id,
        email: user.email,
        phone_number,
        otp_code: otpCode,
        is_verified: false,
        expires_at: expiresAt,
      });
    } catch (err) {
      console.error('Error creating login OTP:', err.message);
      return res.status(500).json({
        message: 'Failed to create OTP record',
        error: err.message,
      });
    }

    // Send OTP via SMS
    const smsResult = await sendOTPViaSMS(phone_number, otpCode);

    if (!smsResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP',
        error: smsResult.error,
      });
    }

    return res.status(200).json({
      message: 'OTP resent successfully to your phone',
      data: {
        phone_number,
      },
      expiresIn: '10 minutes',
      next: 'Use the OTP with phone_number to login',
    });
  } catch (error) {
    console.error('Resend login OTP error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone_number, password, otp_code } = req.body;

    // Case 1: Phone Number + Password login
    if (phone_number && password && !otp_code) {
      const user = await User.findOne({ where: { phone_number } });
      if (!user) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      const token = await signToken({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      });

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
        },
      });
    }

    // Case 2: Phone Number + OTP login
    else if (phone_number && otp_code && !password) {
      // Find user by phone number
      const user = await User.findOne({ where: { phone_number } });
      if (!user) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      // Find and validate OTP
      const otpRecord = await OTP.findOne({
        where: { phone_number, otp_code },
      });

      if (!otpRecord) {
        return res.status(401).json({
          message: 'Invalid OTP',
        });
      }

      // Check if OTP has expired
      if (new Date() > otpRecord.expires_at) {
        return res.status(401).json({
          message: 'OTP has expired',
        });
      }

      // Generate token
      const token = await signToken({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      });

      // Mark OTP as used (optional - delete or update is_verified flag)
      await otpRecord.destroy();

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
        },
      });
    }

    // Case 2: Invalid combination of parameters
    else {
      return res.status(400).json({
        message: 'Invalid login method. Provide either: (1) phone_number+password, or (2) phone_number+otp_code',
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};
