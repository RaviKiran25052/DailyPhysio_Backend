require('dotenv').config();
const Consultation = require('../models/Consultation');
const Therapist = require('../models/Therapist');
const connectDB = require('../config/db');

// Connect to MongoDB
connectDB();

// Consultation data
const consultationData = {
  therapist_id: '6809142f14e77810586058e9',
  patient_id: '6807473300958dbfad42606e',
  recommendedExercises: [
    '6803b993d4fa54dd1adcc19e',
    '6803b993d4fa54dd1adcc1a5'
  ],
  request: {
    activeDays: 30
  }
};

// Function to create consultation and update therapist counts
async function createConsultation() {
  try {
    console.log('Creating new consultation...');
    
    // Create the consultation
    const consultation = await Consultation.create(consultationData);
    console.log('Consultation created successfully with ID:', consultation._id);
    
    // Update therapist request count
    const therapist = await Therapist.findById(consultationData.therapist_id);
    if (therapist) {
      await therapist.calculatePendingRequests();
      console.log(`Updated request count for therapist ${therapist.name} to ${therapist.requestCount}`);
    } else {
      console.warn('Therapist not found. Request count not updated.');
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating consultation:', error);
    process.exit(1);
  }
}

// Run the function
createConsultation(); 