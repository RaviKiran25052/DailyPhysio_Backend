const Therapist = require('../models/Therapist');
const Exercise = require('../models/Exercise');

exports.getTrendingData = async (req, res) => {
    try {
        // Get top 5 trending active therapists
        const trendingTherapists = await Therapist.find({ status: "active" })
            .sort({ consultationCount: -1, followers: -1 })
            .limit(5);

        // Get top 5 trending exercises with filters and excluding the video field
        const trendingExercises = await Exercise.find({
            isPremium: false,
            'custom.createdBy': { $ne: 'proUser' },
            'custom.type': 'public'
        })
            .select('-video') // deselect the video field
            .sort({ views: -1, favorites: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            data: {
                trendingTherapists,
                trendingExercises
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching trending data',
            error: error.message
        });
    }
};