const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.get('/', protect, requireOrgRole(['ADMIN', 'OWNER']), getAuditLogs);

module.exports = router;
