// utils/cloudinaryUtils.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file buffer
 * @param {String} resourceType - 'image' or 'video'
 * @param {String} folder - Folder path in Cloudinary
 * @returns {Promise<String>} - The secure URL of the uploaded file
 */
const uploadToCloudinary = (file, resourceType, folder) => {
	const fileBuffer = file.buffer;
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ resource_type: resourceType, folder },
			(error, result) => {
				if (error) reject(error);
				else resolve(result.secure_url);
			}
		);

		uploadStream.end(fileBuffer);
	});
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects with buffer property
 * @param {String} resourceType - 'image' or 'video'
 * @param {String} folder - Folder path in Cloudinary
 * @returns {Promise<Array<String>>} - Array of secure URLs
 */
const uploadMultipleFiles = async (files, resourceType, folder) => {
	if (!files || files.length === 0) return [];

	const uploadPromises = files.map(file =>
		uploadToCloudinary(file, resourceType, folder)
	);

	return Promise.all(uploadPromises);
};

module.exports = {
	uploadToCloudinary,
	uploadMultipleFiles
};