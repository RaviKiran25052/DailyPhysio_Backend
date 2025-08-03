const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_SERVICE,
		pass: process.env.EMAIL_PASSWORD
	}
});

/**
 * Send a dynamic HTML email
 * @param {Object} options - Mail options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 */
const sendEmail = async ({ to, subject, html }) => {
	const mailOptions = {
		from: process.env.EMAIL_SERVICE,
		to,
		subject,
		html
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log(`Email sent to ${to}`);
	} catch (error) {
		console.error('Email sending error:', error);
		throw new Error('Failed to send email');
	}
};

module.exports = { sendEmail };
