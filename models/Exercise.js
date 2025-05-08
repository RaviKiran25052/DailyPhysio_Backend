const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    instruction: {
      type: String,
      required: true
    },
    video: {
      type: String,
      default: ''
    },
    image: {
      type: [String],
      default: ['']
    },
    reps: {
      type: Number,
      default: 1,
    },
    hold: {
      type: Number,
      default: 1,
    },
    set: {
      type: Number,
      default: 1,
    },
    perform: {
      count: {
        type: Number,
        default: 1,
      },
      type: {
        type: String,
        enum: ['hour', 'day', 'week'],
        default: 'hour',
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    favorites: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: true
    },
    subCategory: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    custom: {
      createdBy: {
        type: String,
        enum: ["proUser", "admin", "therapist"],
        default: "admin"
      },
      type: {
        type: String,
        enum: ["public", "private"],
        default: "public"
      },
      creatorId : {
        type: String,
        required: true,
      },
    }
  },
  { timestamps: true }
);

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise; 