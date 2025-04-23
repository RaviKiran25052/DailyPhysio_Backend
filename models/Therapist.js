const mongoose = require('mongoose');

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
    consultationCount: {
      type: Number,
      default: 0
    },
    requestCount: {
      type: Number,
      default: 0
    },
    experience: {
      type: String,
      required: [true, 'Experience is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Method to calculate the number of pending requests
therapistSchema.methods.calculatePendingRequests = async function() {
  const Consultation = mongoose.model('Consultation');
  const result = await Consultation.aggregate([
    { $match: { therapist_id: this._id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$request.status', 'pending'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
  const totalConsultations = result[0]?.total || 0;
  const pendingRequests = result[0]?.pending || 0;
  
  this.requestCount = pendingRequests;
  this.consultationCount = totalConsultations;
  await this.save();
  return;
};

const Therapist = mongoose.model('Therapist', therapistSchema);

module.exports = Therapist; 