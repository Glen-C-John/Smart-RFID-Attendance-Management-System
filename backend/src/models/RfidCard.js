const mongoose = require('mongoose');

/**
 * Normalizes RFID UID string to standard uppercase colon-delimited format (e.g. "A1:B2:C3:D4").
 */
const normalizeUid = (uid) => {
  if (!uid) return '';
  // Strip non-alphanumeric chars
  const clean = uid.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  // Pair hex characters with colons if even length, else return uppercase cleaned
  if (clean.length >= 2 && clean.length % 2 === 0) {
    return clean.match(/.{1,2}/g).join(':');
  }
  return clean;
};

const rfidCardSchema = new mongoose.Schema(
  {
    cardUid: {
      type: String,
      required: [true, 'Card UID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      set: normalizeUid,
      index: true,
    },
    studentId: {
      type: String,
      required: [true, 'Student ID reference is required'],
      ref: 'Student',
      trim: true,
      uppercase: true,
      index: true,
    },
    storedTagData: {
      type: String,
      trim: true,
      default: null,
      description: 'Preserved legacy block 2 data from physical RFID card (e.g. student name or encoded data)',
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Statics
rfidCardSchema.statics.normalizeUid = normalizeUid;

rfidCardSchema.index({ studentId: 1, status: 1 });

module.exports = mongoose.model('RfidCard', rfidCardSchema);

