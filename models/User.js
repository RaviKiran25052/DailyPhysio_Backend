const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: 'https://res.cloudinary.com/dalzs7bc2/image/upload/v1745832555/Screenshot_2025-04-27_143829_zrew4x.png',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    savedExercises: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Exercise',
      default: [],
    },
    membership: {
      type: {
        type: String,
        enum: ["free", 'monthly', 'yearly'],
        default: "free",
      },
      paymentDate: {
        type: Date,
        default: null,
      },
    },
    creator: {
      createdBy: {
        type: String,
        enum: ["admin", "therapist"],
        default: "admin"
      },
      createdById: {
        type: String,
        default: null,
      },
    },
    role: {
      type: String,
      enum: ["isAdmin", "isUser"],
      default: "isUser"
    },
  },
  {
    timestamps: true,
  }
);

// Method to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 