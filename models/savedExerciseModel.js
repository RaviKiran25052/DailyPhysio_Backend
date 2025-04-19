const mongoose = require('mongoose');

const savedExerciseSchema = mongoose.Schema(
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
    },
    reps: {
      type: Number,
      default: 0,
    },
    hold: {
      type: Number,
      default: 0,
    },
    complete: {
      type: Number,
      default: 0,
    },
    perform: {
      count: {
        type: Number,
        default: 0,
      },
      type: {
        type: String,
        enum: ['day', 'week', 'month'],
        default: 'day',
      },
    },
  },
  {
    timestamps: true,
  }
);

const SavedExercise = mongoose.model('SavedExercise', savedExerciseSchema);

module.exports = SavedExercise; 