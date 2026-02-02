const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/tradingController');

router.get('/orders', tradingController.getOrders);
router.post('/orders', tradingController.createOrder);
router.delete('/orders/:id', tradingController.deleteOrder);
router.put('/orders/status', tradingController.updateStatus);
router.post('/match', tradingController.matchOrder);
router.get('/history', tradingController.getHistory);
router.get('/history/:symbol', tradingController.getEuaHistory);
router.post('/quotes', tradingController.submitQuote);
router.post('/accept-quote', tradingController.acceptQuote);
router.post('/complete-order', tradingController.completeOrder);
router.post('/request-transaction', tradingController.requestTransaction);
router.post('/agree-transaction', tradingController.agreeTransaction);
router.get('/volumes/:symbol', tradingController.getExecutedVolumes);

module.exports = router;
