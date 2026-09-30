require('dotenv').config();
const cloudinary = require('./src/utils/cloudinary');
const fs = require('fs');

async function test() {
  const buf = Buffer.from('test pdf content');
  try {
    const res = await cloudinary.uploadDocument(buf, 'test-doc-upload.pdf');
    console.log('Uploaded:', res.secure_url);
  } catch (e) {
    console.error(e);
  }
}
test();
