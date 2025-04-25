const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const therapistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    specializations: {
      type: [String],
      required:true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'At least one specialization is required'
      }
    },
    workingAt: {
      type: String,
      required: [true, 'Hospital or clinic name is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\d{10}$/, 'Please enter a valid phone number']
    },
    experience: {
      type: String,
      required: [true, 'Experience is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long']
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'rejected'],
      default: 'inactive'
    },
  },
  {
    timestamps: true
  }
);

// Method to hash password before saving
therapistSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
therapistSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Therapist = mongoose.model('Therapist', therapistSchema);

module.exports = Therapist; 