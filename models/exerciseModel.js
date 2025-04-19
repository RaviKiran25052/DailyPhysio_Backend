const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    instruction: {
      type: String,
      required: true
    },
    video: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: [
        'Ankle and Foot',
        'Cervical',
        'Education',
        'Elbow and Hand',
        'Hip and Knee',
        'Lumbar Thoracic',
        'Oral Motor',
        'Shoulder',
        'Special'
      ],
      required: true
    },
    subCategory: {
      type: String,
      required: true
    },
    position: {
      type: String,
      enum: ["Kneeling", "Prone", "Quadruped", "Side Lying", "Sitting", "Standing", "Supine"],
      required: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    isCustom: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Add validation to ensure subCategory matches with the selected category
exerciseSchema.pre('save', function (next) {
  const validSubCategories = {
    'Ankle and Foot': ['AAROM', 'AROM', 'Ball', 'Bosu', 'Elastic Band', 'Elastic Taping', 'Isometric',
      'Miscellaneous', 'Mobilization', 'PROM', 'Stabilization', 'Stretches'],
    'Cervical': ['AAROM', 'AROM', 'Ball', 'Elastic Band', 'Isometric', 'Miscellaneous', 'Mobilization',
      'PROM', 'Stabilization', 'Stretches'],
    'Education': ['Anatomy', 'Body Mechanics', 'Gait Training', 'Miscellaneous', 'Positioning',
      'Stair Training', 'Transfers'],
    'Elbow and Hand': ['AAROM', 'AROM', 'Ball', 'Closed Chain', 'Elastic Band', 'Elastic Taping',
      'Fine Motor', 'Flexbar', 'Free Weight', 'Gripper', 'Isometric', 'Machines and Cables',
      'Miscellaneous', 'Mobilization', 'PROM', 'Putty', 'Stretches', 'TRX'],
    'Hip and Knee': ['4 Way Hip', 'AAROM', 'AROM', 'Balance', 'Ball', 'Bosu', 'Boxes and Steps',
      'Closed Chain', 'Cones', 'Elastic Band', 'Elastic Taping', 'Foam Roll', 'Free Weight',
      'Glider Disk', 'Isometric', 'Kettlebell', 'Ladder Drills', 'Machines and Cables',
      'Medicine Ball', 'Miscellaneous', 'Mobilization', 'Neural Glides', 'Open Chain',
      'Plyometrics', 'PROM', 'Stretches', 'TRX'],
    'Lumbar Thoracic': ['AROM', 'Ball', 'Bosu', 'Elastic Band', 'Elastic Taping', 'Foam Roll',
      'Free Weight', 'Glider Disk', 'Kettlebell', 'Machines and Cables', 'Medicine Ball',
      'Miscellaneous', 'Mobilization', 'Stabilization', 'Stretches', 'Traction', 'TRX'],
    'Oral Motor': ['Cheeks', 'Lips', 'Miscellaneous', 'Speech', 'Swallow', 'TMJ', 'Tongue'],
    'Shoulder': ['6 Way Shoulder', 'AAROM', 'AROM', 'Ball', 'Bosu', 'Elastic Band', 'Elastic Taping',
      'Foam Roll', 'Free Weight', 'Glider Disk', 'Isometric', 'Kettlebell', 'Machines and Cables',
      'Medicine Ball', 'Miscellaneous', 'Mobilization', 'Neural Glides', 'Pendulum', 'PROM',
      'Pulley', 'Stabilization', 'Stretches', 'TRX', 'Wand'],
    'Special': ['Amputee', 'Aquatics', 'Cardio', 'Miscellaneous', 'Modalities', 'Neuro', 'Oculomotor',
      'Pediatric', 'Vestibular', 'Yoga']
  };

  if (!validSubCategories[this.category].includes(this.subCategory)) {
    return next(new Error(`Invalid subCategory '${this.subCategory}' for category '${this.category}'`));
  }
  next();
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise; 