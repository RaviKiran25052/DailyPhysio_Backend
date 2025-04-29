const mongoose = require('mongoose');

const RoutineSchema = mongoose.Schema(
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
    name: {
      type: String,
      required: true,
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
        enum: ['hour', 'day', 'week'],
        default: 'hour',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Routine = mongoose.model('Routine', RoutineSchema);

module.exports = Routine;