const RfidCard = require('../models/RfidCard');
const Student = require('../models/Student');

class CardService {
  /**
   * Register a new RFID card or assign a replacement card to a student.
   */
  async registerCard({ cardUid, studentId, storedTagData, status = 'active' }) {
    const normalizedUid = RfidCard.normalizeUid(cardUid);
    const upperStudentId = studentId.trim().toUpperCase();

    // Verify student exists
    const student = await Student.findOne({ studentId: upperStudentId });
    if (!student) {
      const err = new Error(`Cannot register card: Student '${upperStudentId}' does not exist`);
      err.statusCode = 404;
      throw err;
    }

    // Check if this card UID is already registered
    const existingCard = await RfidCard.findOne({ cardUid: normalizedUid });
    if (existingCard) {
      if (existingCard.status === 'active') {
        const err = new Error(
          `Card UID '${normalizedUid}' is already actively assigned to student '${existingCard.studentId}'`
        );
        err.statusCode = 409;
        throw err;
      }
      // If card was blocked, reactivate and update student reference
      existingCard.studentId = upperStudentId;
      existingCard.status = status;
      if (storedTagData) existingCard.storedTagData = storedTagData;
      existingCard.registeredAt = new Date();
      await existingCard.save();
      return existingCard;
    }

    return RfidCard.create({
      cardUid: normalizedUid,
      studentId: upperStudentId,
      storedTagData: storedTagData || null,
      status,
      registeredAt: new Date(),
    });
  }

  async getCards(filter = {}, page = 1, limit = 50) {
    const query = {};
    if (filter.studentId) query.studentId = filter.studentId.toUpperCase();
    if (filter.status) query.status = filter.status;

    const skip = (page - 1) * limit;
    const [cards, total] = await Promise.all([
      RfidCard.find(query).sort({ registeredAt: -1 }).skip(skip).limit(limit),
      RfidCard.countDocuments(query),
    ]);

    return { cards, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCardByUid(uid) {
    const normalizedUid = RfidCard.normalizeUid(uid);
    const card = await RfidCard.findOne({ cardUid: normalizedUid });
    if (!card) {
      const err = new Error(`RFID Card with UID '${normalizedUid}' not found`);
      err.statusCode = 404;
      throw err;
    }
    const student = await Student.findOne({ studentId: card.studentId });
    return { ...card.toObject(), student };
  }

  async blockCard(uid) {
    const normalizedUid = RfidCard.normalizeUid(uid);
    const card = await RfidCard.findOneAndUpdate(
      { cardUid: normalizedUid },
      { status: 'blocked' },
      { returnDocument: 'after' }
    );
    if (!card) {
      const err = new Error(`RFID Card with UID '${normalizedUid}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return card;
  }

  async activateCard(uid) {
    const normalizedUid = RfidCard.normalizeUid(uid);
    const card = await RfidCard.findOneAndUpdate(
      { cardUid: normalizedUid },
      { status: 'active' },
      { returnDocument: 'after' }
    );
    if (!card) {
      const err = new Error(`RFID Card with UID '${normalizedUid}' not found`);
      err.statusCode = 404;
      throw err;
    }
    return card;
  }
}

module.exports = new CardService();

