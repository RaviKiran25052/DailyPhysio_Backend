const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const businessId = req.business._id;
		const businessDir = path.join(uploadsDir, businessId.toString());

		// Create business-specific directory if it doesn't exist
		if (!fs.existsSync(businessDir)) {
			fs.mkdirSync(businessDir, { recursive: true });
		}

		cb(null, businessDir);
	},
	filename: function (req, file, cb) {
		// Generate unique filename with timestamp
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const extension = path.extname(file.originalname);
		cb(null, file.fieldname + '-' + uniqueSuffix + extension);
	}
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Only image files are allowed!'), false);
	}
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
	const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'];
	if (allowedVideoTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only video files (MP4, AVI, MOV, WMV, WebM) are allowed!'), false);
	}
};

// Combined file filter for both images and videos
const mediaFileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else if (['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'].includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only image and video files are allowed!'), false);
	}
};

// Configure multer for images
const imageUpload = multer({
	storage: storage,
	fileFilter: imageFileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit per file
		files: 10 // Maximum 10 files per upload
	}
});

// Configure multer for videos
const videoUpload = multer({
	storage: storage,
	fileFilter: videoFileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit per file
		files: 2 // Maximum 2 videos per upload
	}
});

// Configure multer for mixed media (images and videos)
const mediaUpload = multer({
	storage: storage,
	fileFilter: mediaFileFilter,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit per file
		files: 12 // Maximum 12 files per upload (10 images + 2 videos)
	}
});

// Middleware to check image count
const checkImageCount = async (req, res, next) => {
	try {
		const business = req.business;
		const currentImageCount = business.images ? business.images.length : 0;
		const newImageCount = req.files ? req.files.length : 0;

		if (currentImageCount + newImageCount > 10) {
			return res.status(400).json({
				status: 'error',
				message: `Maximum 10 images allowed.You can upload ${10 - currentImageCount} more images.`
			});
		}

		next();
	} catch (error) {
		console.error('Error checking image count:', error);
		res.status(500).json({
			status: 'error',
			message: 'Error validating image count'
		});
	}
};

// Middleware to check video count
const checkVideoCount = async (req, res, next) => {
	try {
		const business = req.business;
		const currentVideoCount = business.videos ? business.videos.length : 0;
		const newVideoCount = req.files ? req.files.length : 0;

		if (currentVideoCount + newVideoCount > 2) {
			return res.status(400).json({
				status: 'error',
				message: `Maximum 2 videos allowed.You can upload ${2 - currentVideoCount} more videos.`
			});
		}

		next();
	} catch (error) {
		console.error('Error checking video count:', error);
		res.status(500).json({
			status: 'error',
			message: 'Error validating video count'
		});
	}
};

// Middleware to check media count (combined images and videos)
const checkMediaCount = async (req, res, next) => {
	try {
		const business = req.business;
		const currentImageCount = business.images ? business.images.length : 0;
		const currentVideoCount = business.videos ? business.videos.length : 0;

		// Count new files by type
		let newImageCount = 0;
		let newVideoCount = 0;

		if (req.files) {
			req.files.forEach(file => {
				if (file.mimetype.startsWith('image/')) {
					newImageCount++;
				} else if (file.mimetype.startsWith('video/')) {
					newVideoCount++;
				}
			});
		}

		// Check limits
		if (currentImageCount + newImageCount > 10) {
			return res.status(400).json({
				status: 'error',
				message: `Maximum 10 images allowed.You can upload ${10 - currentImageCount} more images.`
			});
		}

		if (currentVideoCount + newVideoCount > 2) {
			return res.status(400).json({
				status: 'error',
				message: `Maximum 2 videos allowed.You can upload ${2 - currentVideoCount} more videos.`
			});
		}

		next();
	} catch (error) {
		console.error('Error checking media count:', error);
		res.status(500).json({
			status: 'error',
			message: 'Error validating media count'
		});
	}
};

module.exports = {
	upload: imageUpload,
	imageUpload,
	videoUpload,
	mediaUpload,
	checkImageCount,
	checkVideoCount,
	checkMediaCount
};