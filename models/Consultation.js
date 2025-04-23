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
        enum: ['pending', 'active', 'inactive'],
        default: 'pending'
      },
      activeDays: {
        type: Number,
        default: 0
      },
      startDate: {
        type: Date
      },
      endDate: {
        type: Date
      },
      notes: {
        type: String,
        trim: true
      }
    },
    patientNotes: {
      type: String,
      trim: true
    },
    therapistNotes: {
      type: String,
      trim: true
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Method to activate a consultation
consultationSchema.methods.activateConsultation = async function(activeDays) {
  // Update request status and set active days
  this.request.status = 'active';
  this.request.activeDays = activeDays || 30; // Default to 30 days if not specified
  this.request.startDate = new Date();
  
  // Calculate end date based on active days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + this.request.activeDays);
  this.request.endDate = endDate;
  
  await this.save();

  // Update therapist consultation count
  const Therapist = mongoose.model('Therapist');
  const therapist = await Therapist.findById(this.therapist_id);
  if (therapist) {
    await therapist.updateConsultationCount();
  }

  return this;
};

// Method to check if a consultation is expired
consultationSchema.methods.checkExpiration = async function() {
  if (this.request.status !== 'active') {
    return false;
  }

  const now = new Date();
  if (now > this.request.endDate) {
    this.request.status = 'inactive';
    await this.save();
    return true;
  }

  return false;
};

// Method to add recommended exercise
consultationSchema.methods.addExercise = async function(exerciseId) {
  if (!this.recommendedExercises.includes(exerciseId)) {
    this.recommendedExercises.push(exerciseId);
    await this.save();
  }
  return this;
};

// Method to remove a recommended exercise
consultationSchema.methods.removeExercise = async function(exerciseId) {
  this.recommendedExercises = this.recommendedExercises.filter(id => 
    id.toString() !== exerciseId.toString()
  );
  await this.save();
  return this;
};

// Middleware to update therapist request count after saving a consultation
consultationSchema.post('save', async function() {
  const Therapist = mongoose.model('Therapist');
  const therapist = await Therapist.findById(this.therapist_id);
  if (therapist) {
    await therapist.calculatePendingRequests();
  }
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation; 