const mongoose = require('mongoose');

const ROLES = ['admin', 'ngo', 'donor'];

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ROLES, default: 'donor' },
  walletAddress: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
  },
  isVerified: {
    type: Boolean,
    default: function defaultIsVerified() {
      return this.role !== 'ngo';
    },
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function defaultVerificationStatus() {
      return this.role === 'ngo' ? 'pending' : 'approved';
    },
    index: true,
  },
  profile: {
    name: String,
    organizationName: String,
    phone: String,
    bio: String,
    avatar: String,
  },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  isActive: { type: Boolean, default: true },
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now },
});

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
