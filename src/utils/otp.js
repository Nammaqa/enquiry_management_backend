const axios = require('axios');
require('dotenv').config();

const whatsappOtpApiBaseUrl = 'http://whatsappapi.fastsmsindia.com/wapp/api/send';
const whatsappOtpApiKey = '272b9fde0ad64f908406fce2fa765414';

const getFastSmsConfig = () => ({
  apiUrl: process.env.FASTSMS_API_URL || whatsappOtpApiBaseUrl,
  apiKey: process.env.FASTSMS_API_KEY || whatsappOtpApiKey,
});

// Generate random OTP (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via FastSMS WhatsApp API
const sendOTPViaSMS = async (phoneNumber, otpCode) => {
  try {
    let formattedPhone = String(phoneNumber || '').replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const message = `Your OTP is: ${otpCode}. This OTP will expire in 10 minutes.`;
    const { apiKey, apiUrl } = getFastSmsConfig();

    if (!apiKey || !apiUrl) {
      throw new Error('FastSMS API credentials not configured');
    }

    const url = `${apiUrl}?apikey=${apiKey}&mobile=${formattedPhone}&msg=${encodeURIComponent(message)}`;

    const response = await axios.get(url, {
      timeout: 5000,
    });

    console.log('SMS OTP Response:', response.data);

    if (response.data && response.data.status === 'ERROR') {
      console.error('FastSMS API Error:', response.data.errormsg);
      return {
        success: false,
        message: `FastSMS API Error: ${response.data.errormsg}`,
        error: response.data.errormsg,
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      data: response.data,
    };
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    return {
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    };
  }
};

module.exports = {
  generateOTP,
  sendOTPViaSMS,
  whatsappOtpApiBaseUrl,
  whatsappOtpApiKey,
};
