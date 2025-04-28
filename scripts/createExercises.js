const mongoose = require('mongoose');
require('dotenv').config();

// Import the Exercise model (assuming you defined it elsewhere based on your schema)
const Exercise = require('../models/exerciseModel'); // Adjust path as needed
const connectDB = require('../config/db');

// Database Connection
connectDB();

// Sample exercise data
const exercisesData = [
	// Ankle and Foot
	{
		title: "Ankle Dorsiflexion with Band",
		description: "Strengthens the anterior tibialis muscle and improves ankle mobility",
		instruction: "Sit with legs extended. Loop resistance band around the top of your foot, holding the ends. Pull toes toward shin against resistance, then slowly return to starting position.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://static.vecteezy.com/system/resources/previews/021/333/809/non_2x/woman-doing-resistance-band-plantar-flexion-or-ankle-pumps-vector.jpg",
		category: "Ankle and Foot",
		subCategory: "Elastic Band",
		position: "Sitting",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Foot Mobilization",
		description: "Improves foot joint mobility and reduces stiffness",
		instruction: "Sit comfortably. Hold foot with both hands and gently mobilize the joints with small oscillations. Focus on midfoot and forefoot joints.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://static.vecteezy.com/system/resources/previews/021/333/809/non_2x/woman-doing-resistance-band-plantar-flexion-or-ankle-pumps-vector.jpg",
		category: "Ankle and Foot",
		subCategory: "Mobilization",
		position: "Sitting",
		isPremium: true,
		isCustom: false
	},

	// Cervical
	{
		title: "Cervical Retraction",
		description: "Helps with proper neck alignment and reduces forward head posture",
		instruction: "Sit or stand with neutral spine. Gently pull chin straight back, creating a 'double chin'. Hold for 5 seconds, then relax. Repeat 10 times.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://static.vecteezy.com/system/resources/previews/021/333/809/non_2x/woman-doing-resistance-band-plantar-flexion-or-ankle-pumps-vector.jpg",
		category: "Cervical",
		subCategory: "AROM",
		position: "Sitting",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Upper Trapezius Stretch",
		description: "Relieves tension in the upper trapezius and neck",
		instruction: "Sit or stand tall. Bring right ear toward right shoulder, using right hand to gently increase stretch. Hold 30 seconds, then switch sides.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Cervical",
		subCategory: "Stretches",
		position: "Sitting",
		isPremium: false,
		isCustom: false
	},

	// Education
	{
		title: "Proper Lifting Mechanics",
		description: "Educational guide on how to lift objects safely",
		instruction: "Stand close to object. Bend at knees and hips, not waist. Keep back straight and core engaged. Lift with legs, keeping object close to body.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Education",
		subCategory: "Body Mechanics",
		position: "Standing",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Stair Navigation Training",
		description: "Teaches safe techniques for ascending and descending stairs",
		instruction: "For ascending: Lead with stronger leg. For descending: Lead with weaker leg. Use handrail for support. Maintain good posture throughout.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Education",
		subCategory: "Stair Training",
		position: "Standing",
		isPremium: true,
		isCustom: false
	},

	// Elbow and Hand
	{
		title: "Wrist Flexor Stretch",
		description: "Stretches the wrist flexor muscles to reduce forearm tension",
		instruction: "Extend arm with palm up. Use opposite hand to gently pull fingers back toward body until stretch is felt in forearm. Hold 30 seconds.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Elbow and Hand",
		subCategory: "Stretches",
		position: "Standing",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Putty Grip Strengthening",
		description: "Improves grip strength and finger dexterity",
		instruction: "Roll therapy putty into ball shape. Squeeze putty with full hand, hold 5 seconds, then release. Repeat 10-15 times.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Elbow and Hand",
		subCategory: "Putty",
		position: "Sitting",
		isPremium: false,
		isCustom: false
	},

	// Hip and Knee
	{
		title: "Glute Bridge",
		description: "Activates glutes and strengthens hip extensors",
		instruction: "Lie on back with knees bent, feet flat on floor. Push through heels to lift hips toward ceiling. Hold at top for 2 seconds, then lower. Repeat 15 times.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Hip and Knee",
		subCategory: "AROM",
		position: "Supine",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Lateral Band Walks",
		description: "Strengthens hip abductors and improves knee stability",
		instruction: "Place resistance band around thighs above knees. Assume half-squat position. Step sideways while maintaining tension on band. Take 10 steps each direction.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Hip and Knee",
		subCategory: "Elastic Band",
		position: "Standing",
		isPremium: true,
		isCustom: false
	},

	// Lumbar Thoracic
	{
		title: "Cat-Cow Stretch",
		description: "Improves spine mobility and reduces back stiffness",
		instruction: "Start on hands and knees. Alternate between arching back upward (cat) and letting belly drop toward floor while lifting chest and tailbone (cow). Move slowly with breath.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Lumbar Thoracic",
		subCategory: "AROM",
		position: "Quadruped",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Thoracic Foam Rolling",
		description: "Releases tension in mid-back and improves thoracic mobility",
		instruction: "Place foam roller perpendicular to spine at mid-back level. Support head with hands. Roll up and down thoracic spine slowly. Pause at tight spots for 30 seconds.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Lumbar Thoracic",
		subCategory: "Foam Roll",
		position: "Supine",
		isPremium: false,
		isCustom: true
	},

	// Oral Motor
	{
		title: "Tongue Strengthening Exercise",
		description: "Improves tongue strength for speech and swallowing",
		instruction: "Press tongue firmly against the roof of mouth, hold for 5 seconds. Then push tongue against inside of each cheek. Repeat sequence 10 times.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Oral Motor",
		subCategory: "Tongue",
		position: "Sitting",
		isPremium: true,
		isCustom: false
	},
	{
		title: "Lip Closure Exercise",
		description: "Improves lip strength and control for speech and eating",
		instruction: "Hold a flat tongue depressor between lips. Maintain grip without using teeth. Progress by adding resistance or holding longer.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Oral Motor",
		subCategory: "Lips",
		position: "Sitting",
		isPremium: false,
		isCustom: false
	},

	// Shoulder
	{
		title: "Shoulder External Rotation with Band",
		description: "Strengthens external rotators of the shoulder",
		instruction: "Stand with elbow bent 90 degrees at side. Hold resistance band and rotate forearm outward, keeping elbow tucked. Return slowly. Repeat 15 times.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Shoulder",
		subCategory: "Elastic Band",
		position: "Standing",
		isPremium: false,
		isCustom: false
	},
	{
		title: "Pendulum Exercise",
		description: "Gentle shoulder mobility exercise for rotator cuff issues",
		instruction: "Lean forward, supporting weight with non-affected arm. Let affected arm hang freely. Gently swing arm in small circles, gradually increasing size. Perform for 1 minute.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Shoulder",
		subCategory: "Pendulum",
		position: "Standing",
		isPremium: false,
		isCustom: false
	},

	// Special
	{
		title: "Vestibular Balance Training",
		description: "Improves balance and reduces dizziness for vestibular disorders",
		instruction: "Stand with feet together, arms at sides. Focus on fixed point at eye level. Hold position for 30 seconds. Progress by closing eyes or standing on foam surface.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Special",
		subCategory: "Vestibular",
		position: "Standing",
		isPremium: true,
		isCustom: false
	},
	{
		title: "Chair Yoga - Modified Sun Salutation",
		description: "Gentle yoga sequence that can be performed seated",
		instruction: "Sit tall in chair. Raise arms overhead while inhaling. Exhale and forward fold toward knees. Inhale, lift chest for half-fold. Exhale, return to forward fold. Inhale, raise arms overhead. Exhale, return to start.",
		video: "https://www.youtube.com/watch?v=-r0eoFS7_5Q",
		image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0HU5cxX2C8No1r31Lup406_apa9ctf6mbNg&s",
		category: "Special",
		subCategory: "Yoga",
		position: "Sitting",
		isPremium: false,
		isCustom: true
	}
];

// Function to insert data
const importData = async () => {
	try {
		await connectDB();

		// Clear existing data (optional)
		await Exercise.deleteMany({});
		console.log('Existing exercises data cleared');

		// Insert new data
		const createdExercises = await Exercise.insertMany(exercisesData);
		console.log(`${createdExercises.length} exercises inserted successfully`);

		// Disconnect from DB
		mongoose.disconnect();
		console.log('Database connection closed');

		process.exit(0);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
};

// Run the import function
importData();