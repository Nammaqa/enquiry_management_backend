const { User, OTP } = require('../models');
const { comparePassword } = require('../utils/password');
const { signToken } = require('../config/jwt');
const { generateOTP, sendOTPViaSMS } = require('../utils/otp');

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  return String(phoneNumber).replace(/\D/g, '');
};

const buildLoginResponse = (user, token) => ({
  message: 'Login successful',
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone_number: user.phone_number,
    role: user.role,
  },
  name: user.name,
  email: user.email,
  phone_number: user.phone_number,
  role: user.role,
});

exports.sendLoginOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone_number);

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ where: { phone_number: normalizedPhone } });
    if (!user) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.destroy({ where: { phone_number: normalizedPhone } });
    await OTP.create({
      userId: user.id,
      email: user.email,
      phone_number: normalizedPhone,
      otp_code: otpCode,
      is_verified: false,
      expires_at: expiresAt,
    });

    const smsResponse = await sendOTPViaSMS(normalizedPhone, otpCode);
    if (!smsResponse.success) {
      return res.status(500).json({
        message: 'Failed to send OTP',
        error: smsResponse.error,
      });
    }

    return res.status(200).json({
      message: 'OTP sent successfully to your phone',
      data: { phone_number: normalizedPhone },
      expiresIn: '10 minutes',
      next: 'Use the OTP with phone_number to login',
    });
  } catch (error) {
    console.error('Send instructor login OTP error:', error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resendLoginOTP = async (req, res) => {
  return exports.sendLoginOTP(req, res);
};

exports.login = async (req, res) => {
  try {
    const { email, password, phone_number, otp_code } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone_number);

    if (email && password && !normalizedPhone && !otp_code) {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

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

      return res.json(buildLoginResponse(user, token));
    }

    if (normalizedPhone && password && !email && !otp_code) {
      const user = await User.findOne({ where: { phone_number: normalizedPhone } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

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

      return res.json(buildLoginResponse(user, token));
    }

    if (normalizedPhone && otp_code && !email && !password) {
      const user = await User.findOne({ where: { phone_number: normalizedPhone } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const otpRecord = await OTP.findOne({
        where: { phone_number: normalizedPhone, otp_code },
      });

      if (!otpRecord) {
        return res.status(401).json({ message: 'Invalid OTP' });
      }

      if (new Date() > new Date(otpRecord.expires_at)) {
        return res.status(401).json({ message: 'OTP has expired' });
      }

      await otpRecord.destroy();

      const token = await signToken({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      });

      return res.json(buildLoginResponse(user, token));
    }

    if (!email && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    return res.status(400).json({
      message: 'Invalid login method. Provide either: (1) email + password, (2) phone_number + password, or (3) phone_number + otp_code',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    return res.status(200).json({
      message: 'Token is valid',
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
