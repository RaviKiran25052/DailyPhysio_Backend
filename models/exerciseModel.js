const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    instruction: {
      type: String,
      required: true,
    },
    video: {
      type: String,
    },
    image: {
      type: String,
    },
    category: {
      type: String,
      enum: ['Rehabilitation', 'Mobility', 'Strength', 'Functional', 'Prevention', 'Pain Management', 'Conditioning'],
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise; 