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
      default: 'https://res.cloudinary.com/dqj0xgk8v/image/upload/v1698236482/DefaultProfileImage.png',
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
    role:{
      type:String,
      enum:["isAdmin","isUser"],
      default:"isUser"
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