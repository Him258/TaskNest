const express = require('express');
const router = express.Router({ mergeParams: true });
const { addComment, getTaskComments } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.post('/', protect, requireOrgRole(['MEMBER', 'ADMIN', 'OWNER']), addComment);
router.get('/', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getTaskComments);

module.exports = router;
