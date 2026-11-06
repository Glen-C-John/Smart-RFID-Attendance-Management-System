const mongoose = require('mongoose');

/**
 * Normalizes RFID UID string to standard uppercase colon-delimited format (e.g. "A1:B2:C3:D4").
 * Handles uppercase, lowercase, colons, hyphens, spaces, and single-digit nibbles with missing leading zeros.
 */
const normalizeUid = (uid) => {
  if (!uid || typeof uid !== 'string') return '';
  const trimmed = uid.trim();

  // If delimiters are present (colons, hyphens, spaces)
  const delimiterRegex = /[:\-\s]+/;
  if (delimiterRegex.test(trimmed)) {
    const parts = trimmed.split(delimiterRegex).filter(Boolean);
    // Pad single hex digits with leading zero (e.g. "7" -> "07")
    const padded = parts.map((p) => (p.length === 1 ? '0' + p : p)).join('');
    const clean = padded.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length >= 2 && clean.length % 2 === 0) {
      return clean.match(/.{1,2}/g).join(':');
    }
    return clean;
  }

  // Strip non-alphanumeric chars
  const clean = trimmed.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  // Pair hex characters with colons if even length, else return uppercase cleaned
  if (clean.length >= 2 && clean.length % 2 === 0) {
    return clean.match(/.{1,2}/g).join(':');
  }
  return clean;
};

/**
 * Validates whether a UID conforms to standard RFID UID constraints (4 to 10 bytes = 8 to 20 hex chars).
 */
const isValidUid = (uid) => {
  if (!uid || typeof uid !== 'string') return false;
  const normalized = normalizeUid(uid);
  const hexOnly = normalized.replace(/[^A-F0-9]/g, '');
  return hexOnly.length >= 8 && hexOnly.length <= 20 && hexOnly.length % 2 === 0;
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
rfidCardSchema.statics.isValidUid = isValidUid;

rfidCardSchema.index({ studentId: 1, status: 1 });

module.exports = mongoose.model('RfidCard', rfidCardSchema);

