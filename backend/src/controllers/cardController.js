const cardService = require('../services/cardService');
const { successResponse } = require('../utils/response');

const registerCard = async (req, res, next) => {
  try {
    const { cardUid, studentId, storedTagData, status } = req.body;
    if (!cardUid || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'cardUid and studentId are required fields',
      });
    }

    const card = await cardService.registerCard({
      cardUid,
      studentId,
      storedTagData,
      status,
    });

    return successResponse(res, { card }, 'RFID card registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getCards = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await cardService.getCards(req.query, page, limit);
    return successResponse(res, result, 'Cards retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getCardByUid = async (req, res, next) => {
  try {
    const card = await cardService.getCardByUid(req.params.uid);
    return successResponse(res, { card }, 'Card details retrieved');
  } catch (error) {
    next(error);
  }
};

const blockCard = async (req, res, next) => {
  try {
    const card = await cardService.blockCard(req.params.uid);
    return successResponse(res, { card }, 'Card blocked successfully');
  } catch (error) {
    next(error);
  }
};

const activateCard = async (req, res, next) => {
  try {
    const card = await cardService.activateCard(req.params.uid);
    return successResponse(res, { card }, 'Card activated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerCard,
  getCards,
  getCardByUid,
  blockCard,
  activateCard,
};

