const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
      default: 'MEMBER',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes specified in requirements:
// Unique compound index: { user, organization }
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });
// Compound index: { organization, role }
membershipSchema.index({ organization: 1, role: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
