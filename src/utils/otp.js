const axios = require('axios');
require('dotenv').config();

// Generate random OTP (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via FastSMS WhatsApp API
const sendOTPViaSMS = async (phoneNumber, otpCode) => {
  try {
    // Format phone number: ensure it starts with country code (91 for India)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }

    const message = `Your OTP is: ${otpCode}. This OTP will expire in 10 minutes.`;
    const apiKey = process.env.FASTSMS_API_KEY;
    const apiUrl = process.env.FASTSMS_API_URL;
    
    if (!apiKey || !apiUrl) {
      throw new Error('FastSMS API credentials not configured in environment variables');
    }
    
    const url = `${apiUrl}?apikey=${apiKey}&mobile=${formattedPhone}&msg=${encodeURIComponent(message)}`;

    const response = await axios.get(url, {
      timeout: 5000,
    });
    
    console.log('SMS OTP Response:', response.data);

    // Check if API returned an error status
    if (response.data.status === 'ERROR') {
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
};
