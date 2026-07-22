const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
exports.uploadImage = async (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        public_id: fileName,
        folder: 'enquiry_system',
        overwrite: true,
        quality: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Delete image from Cloudinary
exports.deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

// Get image URL
exports.getImageUrl = (publicId) => {
  return cloudinary.url(publicId, {
    secure: true,
  });
};

// Update image (delete old and upload new)
exports.updateImage = async (oldPublicId, fileBuffer, newFileName) => {
  try {
    // Delete old image
    if (oldPublicId) {
      await exports.deleteImage(oldPublicId);
    }

    // Upload new image
    const uploadResult = await exports.uploadImage(fileBuffer, newFileName);
    return uploadResult;
  } catch (error) {
    throw error;
  }
};

// Upload document to Cloudinary (PDF, DOCX, TXT, etc.)
exports.uploadDocument = async (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        public_id: fileName,
        folder: 'enquiry_system/documents',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Delete document from Cloudinary
exports.deleteDocument = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
    return result;
  } catch (error) {
    throw error;
  }
};

// Update document (delete old and upload new)
exports.updateDocument = async (oldPublicId, fileBuffer, newFileName) => {
  try {
    // Delete old document
    if (oldPublicId) {
      await exports.deleteDocument(oldPublicId);
    }

    // Upload new document
    const uploadResult = await exports.uploadDocument(fileBuffer, newFileName);
    return uploadResult;
  } catch (error) {
    throw error;
  }
};
