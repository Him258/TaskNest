const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getUserOrganizations,
  getOrgMembers,
  addOrgMember,
  removeOrgMember,
  updateMemberRole,
} = require('../controllers/orgController');
const { protect } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.post('/', protect, createOrganization);
router.get('/', protect, getUserOrganizations);

router.get('/:id/members', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getOrgMembers);
router.post('/:id/members', protect, requireOrgRole(['ADMIN', 'OWNER']), addOrgMember);
router.delete('/:id/members/:userId', protect, requireOrgRole(['ADMIN', 'OWNER']), removeOrgMember);
router.patch('/:id/members/:userId', protect, requireOrgRole(['ADMIN', 'OWNER']), updateMemberRole);

module.exports = router;
