const mongoose = require('mongoose');

const FavoritesSchema = mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		exerciseId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'Exercise',
		}
	},
	{
		timestamps: true,
	}
);

const Favorites = mongoose.model('Favorites', FavoritesSchema);

module.exports = Favorites;