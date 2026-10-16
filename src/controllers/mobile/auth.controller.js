const { Enquiry, User, OTP } = require('../../models');
const { Op } = require('sequelize');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signToken } = require('../../config/jwt');
const { generateOTP, sendOTPViaSMS } = require('../../utils/otp');
const { sendOTPViaEmail } = require('../../utils/mailer');

const getPhoneCandidates = (phone) => {
  if (!phone) return [];
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

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if phone already exists (primary identifier for mobile signup)
    let student = await Enquiry.findOne({ where: { phone: phone_number } });

    if (!student) {
      // Also check if email exists to prevent duplicate accounts
      const existingEmail = await Enquiry.findOne({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return res.status(400).json({
          message: 'Email already registered with a different phone number',
        });
      }

      // Create new student account in Enquiry table
      const hashedPassword = await hashPassword(password);

      student = await Enquiry.create({
        name: fullName,
        email: normalizedEmail,
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

    // Delete any existing OTP for this phone or email
    try {
      await OTP.destroy({
        where: {
          [Op.or]: [
            { phone_number },
            { email: normalizedEmail },
            { userId: student.id },
          ],
        },
      });
    } catch (err) {
      console.error('Error deleting old OTP:', err.message);
    }

    // Save OTP to database
    const otpRecord = await OTP.create({
      userId: student.id,
      email: normalizedEmail,
      phone_number,
      fullName,
      otp_code: otpCode,
      is_verified: false,
      expires_at: expiresAt,
    });

    // Send OTP via Email and SMS
    let emailSent = false;
    let smsSent = false;
    let emailError = null;
    let smsError = null;

    try {
      const emailResult = await sendOTPViaEmail({
        to: normalizedEmail,
        otpCode,
        fullName,
        purpose: 'signup',
      });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error;
      }
    } catch (err) {
      emailError = err.message;
      console.error('Email sending exception:', err.message);
    }

    try {
      const smsResult = await sendOTPViaSMS(phone_number, otpCode);
      smsSent = smsResult.success;
      if (!smsResult.success) {
        smsError = smsResult.error;
      }
    } catch (err) {
      smsError = err.message;
      console.error('SMS sending exception:', err.message);
    }

    // If both failed, return an error
    if (!emailSent && !smsSent) {
      return res.status(500).json({
        message: 'Failed to deliver OTP via email or SMS',
        emailError,
        smsError,
      });
    }

    const deliveredChannels = [];
    if (emailSent) deliveredChannels.push('email');
    if (smsSent) deliveredChannels.push('phone');

    return res.status(200).json({
      message: `OTP sent successfully to your ${deliveredChannels.join(' and ')}`,
      deliveredTo: deliveredChannels,
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
    const { student_id, phone_number, email, otp_code } = req.body;

    // Validate required fields
    if (!otp_code) {
      return res.status(400).json({
        message: 'otp_code is required',
      });
    }

    if (!student_id && !phone_number && !email) {
      return res.status(400).json({
        message: 'At least one identifier (student_id, phone_number, or email) is required along with otp_code',
      });
    }

    const orConditions = [];
    if (student_id) {
      orConditions.push({ userId: student_id });
    }
    if (phone_number) {
      const candidates = getPhoneCandidates(phone_number);
      orConditions.push({ phone_number: { [Op.in]: candidates } });
    }
    if (email) {
      orConditions.push({ email: String(email).trim().toLowerCase() });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      where: {
        otp_code: String(otp_code).trim(),
        [Op.or]: orConditions,
      },
      order: [['createdAt', 'DESC']],
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
    let student = null;
    if (student_id) {
      student = await Enquiry.findByPk(student_id);
    }
    if (!student && otpRecord.userId) {
      student = await Enquiry.findByPk(otpRecord.userId);
    }
    if (!student && (email || otpRecord.email)) {
      const searchEmail = (email || otpRecord.email).trim().toLowerCase();
      student = await Enquiry.findOne({ where: { email: searchEmail } });
    }
    if (!student && (phone_number || otpRecord.phone_number)) {
      const candidates = getPhoneCandidates(phone_number || otpRecord.phone_number);
      student = await Enquiry.findOne({ where: { phone: { [Op.in]: candidates } } });
    }

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
        candidateStatus: student.candidateStatus,
        batchId: student.batchId,
        subjectIds: student.subjectIds || [],
        classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
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
    const { student_id, phone_number, email } = req.body;

    // Validate required fields
    if (!student_id && !phone_number && !email) {
      return res.status(400).json({
        message: 'At least one identifier (student_id, phone_number, or email) is required',
      });
    }

    // Verify student exists
    let student = null;
    if (student_id) {
      student = await Enquiry.findByPk(student_id);
    }
    if (!student && email) {
      student = await Enquiry.findOne({ where: { email: String(email).trim().toLowerCase() } });
    }
    if (!student && phone_number) {
      const candidates = getPhoneCandidates(phone_number);
      student = await Enquiry.findOne({ where: { phone: { [Op.in]: candidates } } });
    }

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    const targetEmail = (email || student.email || '').trim().toLowerCase();
    const targetPhone = phone_number || student.phone;

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete existing OTPs
    try {
      await OTP.destroy({
        where: {
          [Op.or]: [
            { userId: student.id },
            ...(targetPhone ? [{ phone_number: targetPhone }] : []),
            ...(targetEmail ? [{ email: targetEmail }] : []),
          ],
        },
      });
    } catch (err) {
      console.error('Error cleaning old OTP:', err.message);
    }

    // Create new OTP record
    const otpRecord = await OTP.create({
      userId: student.id,
      email: targetEmail,
      phone_number: targetPhone || '',
      fullName: student.name,
      otp_code: otpCode,
      is_verified: false,
      expires_at: expiresAt,
    });

    // Send OTP via Email and/or SMS
    let emailSent = false;
    let smsSent = false;
    let emailError = null;
    let smsError = null;

    if (targetEmail) {
      try {
        const emailResult = await sendOTPViaEmail({
          to: targetEmail,
          otpCode,
          fullName: student.name,
          purpose: 'signup',
        });
        emailSent = emailResult.success;
        if (!emailResult.success) emailError = emailResult.error;
      } catch (err) {
        emailError = err.message;
      }
    }

    if (targetPhone) {
      try {
        const smsResult = await sendOTPViaSMS(targetPhone, otpCode);
        smsSent = smsResult.success;
        if (!smsResult.success) smsError = smsResult.error;
      } catch (err) {
        smsError = err.message;
      }
    }

    if (!emailSent && !smsSent) {
      return res.status(500).json({
        message: 'Failed to resend OTP via email or SMS',
        emailError,
        smsError,
      });
    }

    const deliveredChannels = [];
    if (emailSent) deliveredChannels.push('email');
    if (smsSent) deliveredChannels.push('phone');

    return res.status(200).json({
      message: `OTP resent successfully to your ${deliveredChannels.join(' and ')}`,
      deliveredTo: deliveredChannels,
      data: {
        student_id: student.id,
        email: targetEmail,
        phone_number: targetPhone,
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
    const { phone_number, email } = req.body;

    // Validate required fields
    if (!phone_number && !email) {
      return res.status(400).json({
        message: 'Phone number or email is required',
      });
    }

    let user = null;
    let student = null;

    if (phone_number) {
      const candidates = getPhoneCandidates(phone_number);
      user = await User.findOne({ where: { phone_number: { [Op.in]: candidates } } });
      student = user ? null : await Enquiry.findOne({ where: { phone: { [Op.in]: candidates } } });
    } else if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      user = await User.findOne({ where: { email: normalizedEmail } });
      student = user ? null : await Enquiry.findOne({ where: { email: normalizedEmail } });
    }

    if (!user && !student) {
      return res.status(404).json({
        message: 'Account not found',
      });
    }

    const targetEmail = (email || (user ? user.email : student.email) || '').trim().toLowerCase();
    const targetPhone = phone_number || (user ? user.phone_number : student.phone);

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing OTP for this user/phone/email
    try {
      await OTP.destroy({
        where: {
          [Op.or]: [
            ...(targetPhone ? [{ phone_number: targetPhone }] : []),
            ...(targetEmail ? [{ email: targetEmail }] : []),
            ...(student ? [{ userId: student.id }] : []),
          ],
        },
      });
    } catch (err) {
      console.error('Error deleting old OTP:', err.message);
    }

    // Save OTP to database
    try {
      await OTP.create({
        userId: student ? student.id : null,
        email: targetEmail,
        phone_number: targetPhone || '',
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

    let emailSent = false;
    let smsSent = false;
    let emailError = null;
    let smsError = null;

    if (targetEmail) {
      try {
        const emailResult = await sendOTPViaEmail({
          to: targetEmail,
          otpCode,
          fullName: user ? user.name : student.name,
          purpose: 'login',
        });
        emailSent = emailResult.success;
        if (!emailResult.success) emailError = emailResult.error;
      } catch (err) {
        emailError = err.message;
      }
    }

    if (targetPhone) {
      try {
        const smsResult = await sendOTPViaSMS(targetPhone, otpCode);
        smsSent = smsResult.success;
        if (!smsResult.success) smsError = smsResult.error;
      } catch (err) {
        smsError = err.message;
      }
    }

    if (!emailSent && !smsSent) {
      return res.status(500).json({
        message: 'Failed to send OTP via email or SMS',
        emailError,
        smsError,
      });
    }

    const deliveredChannels = [];
    if (emailSent) deliveredChannels.push('email');
    if (smsSent) deliveredChannels.push('phone');

    return res.status(200).json({
      message: `OTP sent successfully to your ${deliveredChannels.join(' and ')}`,
      deliveredTo: deliveredChannels,
      data: {
        phone_number: targetPhone,
        email: targetEmail,
      },
      expiresIn: '10 minutes',
      next: 'Use the OTP to login',
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
  return exports.sendLoginOTP(req, res);
};

exports.login = async (req, res) => {
  try {
    const { phone_number, email, password, otp_code } = req.body;

    // Validate required fields
    if (!phone_number && !email) {
      return res.status(400).json({
        message: 'phone_number or email is required',
      });
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const phoneCandidates = phone_number ? getPhoneCandidates(phone_number) : [];

    // Case 1: Password login (phone or email + password)
    if ((phone_number || normalizedEmail) && password && !otp_code) {
      const userCondition = [];
      const studentCondition = [];

      if (phoneCandidates.length > 0) {
        userCondition.push({ phone_number: { [Op.in]: phoneCandidates } });
        studentCondition.push({ phone: { [Op.in]: phoneCandidates } });
      }
      if (normalizedEmail) {
        userCondition.push({ email: normalizedEmail });
        studentCondition.push({ email: normalizedEmail });
      }

      const user = await User.findOne({ where: { [Op.or]: userCondition } });
      const student = user ? null : await Enquiry.findOne({ where: { [Op.or]: studentCondition } });

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
          candidateStatus: student.candidateStatus,
          batchId: student.batchId,
          subjectIds: student.subjectIds || [],
          classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
        },
        enquiryId: student.id,
        candidateStatus: student.candidateStatus,
        batchId: student.batchId,
        classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
      });
    }

    // Case 2: OTP login (phone or email + otp_code)
    else if ((phone_number || normalizedEmail) && otp_code && !password) {
      const userCondition = [];
      const studentCondition = [];

      if (phoneCandidates.length > 0) {
        userCondition.push({ phone_number: { [Op.in]: phoneCandidates } });
        studentCondition.push({ phone: { [Op.in]: phoneCandidates } });
      }
      if (normalizedEmail) {
        userCondition.push({ email: normalizedEmail });
        studentCondition.push({ email: normalizedEmail });
      }

      const user = await User.findOne({ where: { [Op.or]: userCondition } });
      const student = user ? null : await Enquiry.findOne({ where: { [Op.or]: studentCondition } });

      if (!user && !student) {
        return res.status(401).json({
          message: 'Invalid credentials',
        });
      }

      const otpConditions = [];
      if (phoneCandidates.length > 0) {
        otpConditions.push({ phone_number: { [Op.in]: phoneCandidates } });
      }
      if (normalizedEmail) {
        otpConditions.push({ email: normalizedEmail });
      }
      if (student) {
        otpConditions.push({ userId: student.id });
      }

      const otpRecord = await OTP.findOne({
        where: {
          otp_code: String(otp_code).trim(),
          [Op.or]: otpConditions,
          is_verified: false,
        },
        order: [['createdAt', 'DESC']],
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
          candidateStatus: student.candidateStatus,
          batchId: student.batchId,
          subjectIds: student.subjectIds || [],
          classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
        },
        enquiryId: student.id,
        candidateStatus: student.candidateStatus,
        batchId: student.batchId,
        classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
      });
    }

    // Case 3: Invalid combination of parameters
    else {
      return res.status(400).json({
        message: 'Invalid login method. Provide either: (1) phone/email + password, or (2) phone/email + otp_code',
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
        ...(student ? {
          candidateStatus: student.candidateStatus,
          batchId: student.batchId,
          subjectIds: student.subjectIds || [],
          classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
        } : {}),
      };

      return res.status(200).json({
        message: 'Account exists',
        exists: true,
        accountType: user ? 'user' : 'student',
        role: user ? user.role : 'student',
        account,
        student: account,
        ...(student ? {
          candidateStatus: student.candidateStatus,
          batchId: student.batchId,
          classroomEligible: ['class', 'class qualified'].includes(student.candidateStatus),
        } : {}),
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
