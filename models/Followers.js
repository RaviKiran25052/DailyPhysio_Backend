const mongoose = require('mongoose');

const followersSchema = new mongoose.Schema(
	{
		therapistId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Therapist',
		},
		followers: {
			type: [mongoose.Schema.Types.ObjectId],
			required: true,
			ref: 'User',
		},
	},
	{
		timestamps: true
	}
);

const Followers = mongoose.model('Followers', followersSchema);

module.exports = Followers; 