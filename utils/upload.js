const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/therapists');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage limits for therapists (in bytes)
const STORAGE_LIMITS = {
	FREE: 10 * 1024 * 1024 * 1024,    // 10GB
	MONTHLY: 30 * 1024 * 1024 * 1024, // 30GB
	YEARLY: 60 * 1024 * 1024 * 1024 // 60GB
};

// Configure storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const therapistId = req.therapist._id;
		const therapistDir = path.join(uploadsDir, therapistId.toString());

		// Create therapist-specific directory if it doesn't exist
		if (!fs.existsSync(therapistDir)) {
			fs.mkdirSync(therapistDir, { recursive: true });
		}

		cb(null, therapistDir);
	},
	filename: function (req, file, cb) {
		// Generate unique filename with timestamp
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const extension = path.extname(file.originalname);
		cb(null, file.fieldname + '-' + uniqueSuffix + extension);
	}
});

// Combined file filter for therapy session uploads (1 video OR multiple images)
const therapySessionFileFilter = (req, file, cb) => {
	const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
	const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'];

	if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only image and video files are allowed!'), false);
	}
};

// Function to calculate folder size
const getFolderSize = (folderPath) => {
	let size = 0;
	if (fs.existsSync(folderPath)) {
		const files = fs.readdirSync(folderPath);
		files.forEach(file => {
			const filePath = path.join(folderPath, file);
			const stats = fs.statSync(filePath);
			if (stats.isFile()) {
				size += stats.size;
			}
		});
	}
	return size;
};

// Function to get therapist's storage limit based on their tier
const getStorageLimit = (therapistTier) => {
	switch (therapistTier) {
		case 'monthly':
			return STORAGE_LIMITS.MONTHLY;
		case 'yearly':
			return STORAGE_LIMITS.YEARLY;
		default:
			return STORAGE_LIMITS.FREE;
	}
};

// Function to format bytes to human readable format
const formatBytes = (bytes) => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Configure multer for therapy session uploads
const therapySessionUpload = multer({
	storage: storage,
	fileFilter: therapySessionFileFilter,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB limit per file
		files: 10 // Maximum 10 files per upload (for multiple images)
	}
});

// Middleware to check storage limit
const checkStorageLimit = async (req, res, next) => {
	try {
		const therapist = req.therapist;
		const therapistId = therapist._id;
		// todo
		const therapistTier = therapist.tier || 'free'; // Default to free tier

		// Get therapist's folder path
		const therapistDir = path.join(uploadsDir, therapistId.toString());

		// Calculate current storage usage
		const currentUsage = getFolderSize(therapistDir);

		// Get storage limit for this therapist
		const storageLimit = getStorageLimit(therapistTier);

		// Calculate size of new files being uploaded
		let newFilesSize = 0;
		if (req.files) {
			// Handle multer.fields() format
			if (req.files.images) {
				req.files.images.forEach(file => {
					newFilesSize += file.size;
				});
			}
			if (req.files.video) {
				req.files.video.forEach(file => {
					newFilesSize += file.size;
				});
			}
		}

		// Check if upload would exceed storage limit
		if (currentUsage + newFilesSize > storageLimit) {
			const remainingStorage = storageLimit - currentUsage;
			return res.status(400).json({
				status: 'error',
				message: `Storage limit exceeded. You have ${formatBytes(remainingStorage)} remaining out of ${formatBytes(storageLimit)} total storage.`,
				currentUsage: formatBytes(currentUsage),
				storageLimit: formatBytes(storageLimit),
				remainingStorage: formatBytes(remainingStorage)
			});
		}

		// Add storage info to request for later use
		req.storageInfo = {
			currentUsage: formatBytes(currentUsage),
			storageLimit: formatBytes(storageLimit),
			remainingStorage: formatBytes(storageLimit - currentUsage - newFilesSize)
		};

		next();
	} catch (error) {
		console.error('Error checking storage limit:', error);
		res.status(500).json({
			status: 'error',
			message: 'Error validating storage limit'
		});
	}
};

// Middleware to validate therapy session upload (flexible - images and/or videos)
const validateTherapySessionUpload = async (req, res, next) => {
	try {
		// Check if any files were uploaded
		const hasImages = req.files?.images && req.files.images.length > 0;
		const hasVideo = req.files?.video && req.files.video.length > 0;

		if (!hasImages && !hasVideo) {
			return res.status(400).json({
				status: 'error',
				message: 'No files uploaded'
			});
		}

		// Count file types
		const videoCount = hasVideo ? req.files.video.length : 0;
		const imageCount = hasImages ? req.files.images.length : 0;

		// Validate file limits (flexible - allow both images and videos)
		if (videoCount > 1) {
			return res.status(400).json({
				status: 'error',
				message: 'Maximum 1 video is allowed per upload'
			});
		}

		if (imageCount > 10) {
			return res.status(400).json({
				status: 'error',
				message: 'Maximum 10 images allowed per upload'
			});
		}

		next();
	} catch (error) {
		console.error('Error validating therapy session upload:', error);
		res.status(500).json({
			status: 'error',
			message: 'Error validating file upload'
		});
	}
};

// Get therapist's storage info
const getStorageInfo = async (therapist) => {
	try {
		const therapistId = therapist._id;
		const therapistTier = therapist.membership.find(m => m.status === "active")?.type || 'free';

		// Get therapist's folder path
		const therapistDir = path.join(uploadsDir, therapistId.toString());

		// Calculate current storage usage
		const currentUsage = getFolderSize(therapistDir);
		const storageLimit = getStorageLimit(therapistTier);
		const remainingStorage = storageLimit - currentUsage;

		const storageInfo = {
			currentUsage: formatBytes(currentUsage),
			storageLimit: formatBytes(storageLimit),
			remainingStorage: formatBytes(remainingStorage),
			usagePercentage: Math.round((currentUsage / storageLimit) * 100)
		};

		return storageInfo;
	} catch (error) {
		console.error('Error getting storage info:', error);
		return;
	}
};

module.exports = {
	therapySessionUpload,
	checkStorageLimit,
	validateTherapySessionUpload,
	getStorageInfo,
	STORAGE_LIMITS,
	formatBytes
};