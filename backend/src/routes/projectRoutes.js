const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById } = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

// Project creation is reserved for ADMIN and OWNER ("ADMIN: manage projects")
router.post('/', protect, requireOrgRole(['ADMIN', 'OWNER']), createProject);
router.get('/', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getProjects);
router.get('/:id', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getProjectById);

module.exports = router;
