const Therapist = require('../models/Therapist');
const Exercise = require('../models/Exercise');

exports.getTrendingData = async (req, res) => {
    try {
        // Get top 5 trending therapists based on consultationCount and followers
        const trendingTherapists = await Therapist.find()
            .sort({ consultationCount: -1, followers: -1 })
            .limit(5)

        // Get top 5 trending exercises based on views and favorites
        const trendingExercises = await Exercise.find()
            .sort({ views: -1, favorites: -1 })
            .limit(5)

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