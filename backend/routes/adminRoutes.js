const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


router.get('/db-status', adminController.getDbStatus);
router.get('/users', adminController.getUsers);
router.post('/update-permissions', adminController.updatePermissions);
router.post('/reset-password', adminController.resetPassword);

router.get('/email-config', adminController.getEmailConfig);
router.post('/email-config', adminController.updateEmailConfig);

router.get('/trader-contacts', adminController.getTraderContacts);
router.post('/trader-contacts', adminController.updateTraderContacts);

router.get('/stats/visitors', adminController.getStats);

router.get('/eua-manual', adminController.getManualEua);
router.post('/eua-manual', adminController.updateManualEua);
router.post('/refresh-eua-sheet', adminController.refreshEuaSheet);

router.get('/backup', adminController.exportData);
router.post('/restore', adminController.importData);

module.exports = router;
