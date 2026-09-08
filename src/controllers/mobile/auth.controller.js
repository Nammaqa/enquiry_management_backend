const { Enquiry, User, OTP } = require('../../models');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signToken } = require('../../config/jwt');
const { generateOTP, sendOTPViaSMS } = require('../../utils/otp');

const getPhoneCandidates = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  const candidates = [String(phone), digits];

  if (digits.length === 12 && digits.startsWith('91')) {
    candidates.push(digits.substring(2));
  }

  return [...new Set(candidates.filter(Boolean))];
};

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

    // Check if phone already exists (primary identifier for mobile signup)
    let student = await Enquiry.findOne({ where: { phone: phone_number } });

    if (!student) {
      // Also check if email exists to prevent duplicate accounts
      const existingEmail = await Enquiry.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          message: 'Email already registered with a different phone number',
        });
      }

      // Create new student account in Enquiry table
      const hashedPassword = await hashPassword(password);

      student = await Enquiry.create({
        name: fullName,
        email,
        phone: phone_number,
        password: hashedPassword,
        candidateStatus: 'enquiry stage',
        global: false,
      });

      console.log('New enquiry created during signup:', student.id);
    } else {
      console.log('Existing enquiry found, reusing for signup:', student.id);
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this phone
    try {
      await OTP.destroy({ where: { phone_number } });
    } catch (err) {
      console.error('Error deleting old OTP:', err.message);
    }

    // Save OTP to database
    const otpRecord = await OTP.create({
      userId: student.id,
      email,
      phone_number,
      fullName,
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

    return res.status(200).json({
      message: 'OTP sent successfully to your phone',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone_number: student.phone,
      },
      enquiryId: student.id,
      reference_id: otpRecord.id,
      expiresIn: '10 minutes',
      next: 'Verify OTP using /api/mobile/auth/verify-otp endpoint',
    });
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
    const { student_id, phone_number, otp_code } = req.body;

    // Validate required fields
    if (!student_id || !phone_number || !otp_code) {
      return res.status(400).json({
        message: 'student_id, phone_number, and otp_code are required',
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      where: { userId: student_id, phone_number, otp_code },
    });

    if (!otpRecord) {
      return res.status(401).json({
        message: 'Invalid OTP or student credentials',
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

    // Find student from Enquiry table
    const student = await Enquiry.findByPk(student_id);
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    // Mark OTP as verified
    otpRecord.is_verified = true;
    await otpRecord.save();

    // Mark signup as verified in Enquiry table
    student.isSignupVerified = true;
    await student.save();

    // Generate JWT token
    const token = await signToken({
      enquiryId: student.id,
      name: student.name,
      email: student.email,
      phone_number: student.phone,
      role: 'student',
    });

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone_number: student.phone,
      },
      enquiryId: student.id,
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
    const { student_id, phone_number } = req.body;

    // Validate required fields
    if (!student_id || !phone_number) {
      return res.status(400).json({
        message: 'student_id and phone_number are required',
      });
    }

    // Verify student exists
    const student = await Enquiry.findByPk(student_id);
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    // Verify phone number matches student's phone
    if (student.phone !== phone_number) {
      return res.status(400).json({
        message: 'Phone number does not match student account',
      });
    }

    // Find existing OTP record
    const existingOTP = await OTP.findOne({ where: { userId: student_id, phone_number } });
    if (!existingOTP) {
      return res.status(404).json({
        message: 'No pending OTP found for this student and phone number',
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
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

    // Instructors are system users; students are enquiry records.
    const user = await User.findOne({ where: { phone_number } });
    const student = user ? null : await Enquiry.findOne({ where: { phone: phone_number } });
    if (!user && !student) {
      return res.status(404).json({
        message: 'Account not found',
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
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
        userId: student ? student.id : null,
        email: user ? user.email : student.email,
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

    const user = await User.findOne({ where: { phone_number } });
    const student = user ? null : await Enquiry.findOne({ where: { phone: phone_number } });
    if (!user && !student) {
      return res.status(404).json({
        message: 'Account not found',
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
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
        userId: student ? student.id : null,
        email: user ? user.email : student.email,
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

    // Validate required fields
    if (!phone_number) {
      return res.status(400).json({
        message: 'phone_number is required',
      });
    }

    // Case 1: Phone Number + Password login
    if (phone_number && password && !otp_code) {
      const user = await User.findOne({ where: { phone_number } });
      const student = user ? null : await Enquiry.findOne({ where: { phone: phone_number } });
      if (!user && !student) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      if (user) {
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return res.status(401).json({ message: 'Invalid credentials' });
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

      // Check if signup was verified
      if (!student.isSignupVerified) {
        return res.status(403).json({
          message: 'Account not verified. Please complete OTP verification during signup.',
        });
      }

      const isValid = await comparePassword(password, student.password);
      if (!isValid) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      const token = await signToken({
        enquiryId: student.id,
        name: student.name,
        email: student.email,
        phone_number: student.phone,
        role: 'student',
      });

      return res.json({
        message: 'Login successful',
        token,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone_number: student.phone,
        },
        enquiryId: student.id,
      });
    }

    // Case 2: Phone Number + OTP login
    else if (phone_number && otp_code && !password) {
      // Find student by phone number
      const user = await User.findOne({ where: { phone_number } });
      const student = user ? null : await Enquiry.findOne({ where: { phone: phone_number } });
      if (!user && !student) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      const otpRecord = await OTP.findOne({
        where: { phone_number, otp_code, is_verified: false },
      });

      if (!otpRecord || new Date() > otpRecord.expires_at) {
        return res.status(401).json({ message: 'Invalid or expired OTP' });
      }

      await otpRecord.destroy();

      if (user) {
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

      // Check if signup was verified
      if (!student.isSignupVerified) {
        return res.status(403).json({
          message: 'Account not verified. Please complete OTP verification during signup.',
        });
      }

      // Generate token
      const token = await signToken({
        enquiryId: student.id,
        name: student.name,
        email: student.email,
        phone_number: student.phone,
        role : 'student',
      });

      return res.json({
        message: 'Login successful',
        token,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone_number: student.phone,
        },
        enquiryId: student.id,
      });
    }

    // Case 3: Invalid combination of parameters
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

exports.checkStudentExists = async (req, res) => {
  try {
    const phone_number = req.body.phone_number || req.body.phone;

    // Validate required fields
    if (!phone_number) {
      return res.status(400).json({
        message: 'Phone number is required',
        exists: false,
      });
    }

    const phoneCandidates = getPhoneCandidates(phone_number);
    const user = await User.findOne({
      where: { phone_number: { [require('sequelize').Op.in]: phoneCandidates } },
    });
    const student = user
      ? null
      : await Enquiry.findOne({
        where: { phone: { [require('sequelize').Op.in]: phoneCandidates } },
      });

    if (user || student) {
      const account = {
        id: user ? user.id : student.id,
        name: user ? user.name : student.name,
        email: user ? user.email : student.email,
        phone_number: user ? user.phone_number : student.phone,
      };

      return res.status(200).json({
        message: 'Account exists',
        exists: true,
        accountType: user ? 'user' : 'student',
        role: user ? user.role : 'student',
        account,
        student: account,
      });
    } else {
      return res.status(200).json({
        message: 'Account does not exist',
        exists: false,
      });
    }
  } catch (error) {
    console.error('Check student exists error:', error.message);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};
