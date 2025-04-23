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
  const pendingCount = await Consultation.countDocuments({
    therapist_id: this._id,
    'request.status': 'pending'
  });
  
  this.requestCount = pendingCount;
  await this.save();
  return pendingCount;
};

// Method to update consultation count
therapistSchema.methods.updateConsultationCount = async function() {
  const Consultation = mongoose.model('Consultation');
  const consultationCount = await Consultation.countDocuments({
    therapist_id: this._id,
    'request.status': 'active'
  });
  
  this.consultationCount = consultationCount;
  await this.save();
  return consultationCount;
};

const Therapist = mongoose.model('Therapist', therapistSchema);

module.exports = Therapist; 