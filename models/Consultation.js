const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultationSchema = new mongoose.Schema(
  {
    therapist_id: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist ID is required']
    },
    patient_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required']
    },
    recommendedExercises: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exercise'
      }
    ],
    request: {
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
      },
      expiresOn: {
        type: Date,
        default: () => new Date()
      },
    },
    notes: {
      type: String,
      trim: true
    },
  },
  {
    timestamps: true
  }
);

// Method to activate a consultation
consultationSchema.methods.activateConsultation = async function (activeDays) {
  this.request.status = 'active';
  this.request.activeDays = activeDays || 30; // Default to 30 days

  await this.save();

  // Update therapist consultation count
  const Therapist = mongoose.model('Therapist');
  const therapist = await Therapist.findById(this.therapist_id);

  return this;
};

// Method to check if a consultation is expired (calculated, not stored)
consultationSchema.methods.checkExpiration = async function () {
  const expiresOn = this.request.expiresOn;
  const now = new Date();
  const expirationDate = new Date(expiresOn);
  
  if (now > expirationDate) {
    this.request.status = 'inactive';
    await this.save();
    return true;
  } else {
    this.request.status = 'active';
    await this.save();
    return false;
  }
};

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation; 