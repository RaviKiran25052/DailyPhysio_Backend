const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: 'https://res.cloudinary.com/dalzs7bc2/image/upload/v1745832555/Screenshot_2025-04-27_143829_zrew4x.png',
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    savedExercises: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Exercise',
      default: [],
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
    ],
    creator: {
      createdBy: {
        type: String,
        enum: ["admin", "therapist"],
        default: "admin"
      },
      createdById: {
        type: String,
        default: null,
      },
    },
    role: {
      type: String,
      enum: ["isAdmin", "isUser"],
      default: "isUser"
    },
  },
  {
    timestamps: true,
  }
);

// Method to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add this method to your userSchema

userSchema.methods.updateMembershipStatus = function () {
  const currentDate = new Date();
  let membershipUpdated = false;

  // Check each membership entry
  this.membership.forEach(membership => {
    if (membership.type === 'free') {
      // No need to check free memberships
      return;
    }

    if (membership.status === 'active' && membership.paymentDate) {
      let daysDifference;

      if (membership.type === 'monthly') {
        // Calculate difference from payment date + 30 days
        const expiryDate = new Date(membership.paymentDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        daysDifference = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
      } else if (membership.type === 'yearly') {
        // Calculate difference from payment date + 365 days
        const expiryDate = new Date(membership.paymentDate);
        expiryDate.setDate(expiryDate.getDate() + 365);
        daysDifference = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
      }

      // If expired (less than or equal to 0 days remaining)
      if (daysDifference <= 0) {
        membership.status = 'inactive';
        membershipUpdated = true;
      }
    }
  });

  // If any paid membership was deactivated, ensure there's an active free membership
  if (membershipUpdated) {
    const hasActiveFree = this.membership.some(m => m.type === 'free' && m.status === 'active');

    if (!hasActiveFree) {
      // Find existing free membership and activate it, or create new one
      const freeMembership = this.membership.find(m => m.type === 'free');

      if (freeMembership) {
        freeMembership.status = 'active';
      } else {
        // Create new free membership if none exists
        this.membership.push({
          type: 'free',
          paymentDate: null,
          status: 'active'
        });
      }
    }
  }

  return membershipUpdated;
};

// Optional: Helper method to get current active membership
userSchema.methods.getCurrentMembership = function () {
  return this.membership.find(m => m.status === 'active') || null;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 