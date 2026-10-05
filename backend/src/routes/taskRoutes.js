const express = require('express');
const router = express.Router();
const { createTask, getTasks, getTaskById, updateTask, deleteTask, getTaskActivity } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { requireOrgRole } = require('../middleware/rbac');

router.post('/', protect, requireOrgRole(['MEMBER', 'ADMIN', 'OWNER']), createTask);
router.get('/', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getTasks);
router.get('/:id', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getTaskById);
router.get('/:id/activity', protect, requireOrgRole(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']), getTaskActivity);
router.put('/:id', protect, requireOrgRole(['MEMBER', 'ADMIN', 'OWNER']), updateTask);
router.delete('/:id', protect, requireOrgRole(['ADMIN', 'OWNER']), deleteTask);

module.exports = router;
