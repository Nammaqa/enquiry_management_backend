const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using Google Workspace / Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send 6-digit OTP email for signup / login verification
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otpCode - 6-digit OTP code
 * @param {string} [options.fullName] - User's full name
 * @param {string} [options.purpose] - Purpose of OTP ('signup', 'login', 'verification')
 */
const sendOTPViaEmail = async ({ to, otpCode, fullName = 'User', purpose = 'signup' }) => {
  try {
    if (!to) {
      throw new Error('Recipient email address is required');
    }

    const subjectMap = {
      signup: 'Your Account Verification Code - NammaQA',
      login: 'Your Login Verification Code - NammaQA',
      verification: 'Your Verification Code - NammaQA',
    };

    const actionTextMap = {
      signup: 'Thank you for signing up with NammaQA. Please use the verification code below to verify your account:',
      login: 'You requested a verification code to log in to your NammaQA account:',
      verification: 'Please use the verification code below to complete your request:',
    };

    const subject = subjectMap[purpose] || subjectMap.verification;
    const actionText = actionTextMap[purpose] || actionTextMap.verification;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">NammaQA</h1>
          <p style="color: #dbeafe; margin: 6px 0 0 0; font-size: 14px;">Mobile App Verification</p>
        </div>
        <div style="padding: 32px 28px; color: #1e293b;">
          <p style="margin-top: 0; font-size: 16px; font-weight: 600;">Hello ${fullName || 'there'},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0 24px;">
            ${actionText}
          </p>
          
          <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e40af; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          
          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
            ⏳ This code is valid for <strong>10 minutes</strong>. Never share this OTP with anyone.
          </p>
          <p style="font-size: 13px; color: #94a3b8; margin: 12px 0 0 0;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} NammaQA. All rights reserved.
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"NammaQA" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text: `Hello ${fullName},\n\n${actionText}\n\nYour verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\n- NammaQA Team`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email OTP sent successfully to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`✗ Error sending OTP email to ${to}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  transporter,
  sendOTPViaEmail,
};
