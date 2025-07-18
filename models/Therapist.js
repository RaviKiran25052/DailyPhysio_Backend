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
    profilePic: {
      type: String,
      default: "https://res.cloudinary.com/dalzs7bc2/image/upload/v1746784719/doc_jcxqwb.png"
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    specializations: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'At least one specialization is required'
      }
    },
    bio: {
      type: String,
      default: ''
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
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'rejected', 'pending'],
      default: 'pending'
    },
    consultationCount: {
      type: Number,
      default: 0
    },
    membership: [
      {
        type: {
          type: String,
          enum: ["free", 'monthly', 'yearly'],
          default: "free",
        },
        paymentDate: {
          type: Date,
          default: null,
        },
        status: {
          type: String,
          enum: ["active", "inactive"],
          default: "active"
        }
      }
    ]
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

// Method to update consultation count
therapistSchema.methods.updateConsultationCount = async function () {
  const Consultation = mongoose.model('Consultation');
  const count = await Consultation.countDocuments({ therapist_id: this._id });
  this.consultationCount = count;
  await this.save();
};

// Method to compare entered password with hashed password
therapistSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Therapist = mongoose.model('Therapist', therapistSchema);

module.exports = Therapist; 