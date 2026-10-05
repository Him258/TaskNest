const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifications');

// Helper to format assignee for audit logs
const resolveUserName = async (userId) => {
  if (!userId) return 'Unassigned';
  try {
    const user = await User.findById(userId).select('name email').lean();
    return user ? user.name : 'Unassigned';
  } catch {
    return 'Unassigned';
  }
};

// Helper to format due date
const formatDateStr = (dateVal) => {
  if (!dateVal) return 'None';
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? 'None' : d.toISOString().split('T')[0];
  } catch {
    return 'None';
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (MEMBER, ADMIN, OWNER)
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignee, dueDate, labels, attachments, projectId, organizationId } = req.body;
    const orgId = organizationId || req.organizationId;

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and projectId are required' });
    }

    // Verify project belongs to organization
    const project = await Project.findOne({ _id: projectId, organization: orgId }).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found in this organization' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assignee: assignee || null,
      dueDate: dueDate || null,
      labels: Array.isArray(labels) ? labels : labels ? labels.split(',').map((l) => l.trim()) : [],
      attachments: attachments || [],
      project: projectId,
      organization: orgId,
      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .lean();

    const io = req.app.get('io');

    // Audit log for task creation
    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'TASK_CREATE',
      entity: 'TASK',
      entityId: task._id,
      oldValue: null,
      newValue: task.title,
    });

    // Notify assignee if assigned
    if (assignee && assignee.toString() !== req.user._id.toString()) {
      await createNotification({
        user: assignee,
        organization: orgId,
        type: 'TASK_ASSIGNED',
        message: `You were assigned to task "${task.title}"`,
        entityId: task._id,
        io,
      });
    }

    // Emit Socket.IO event to project room
    if (io) {
      io.to(`project:${projectId}`).emit('task:created', populatedTask);
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get / Search Tasks (Advanced Search with filters & pagination)
// @route   GET /api/tasks
// @access  Private (Org Members)
const getTasks = async (req, res) => {
  try {
    const orgId = req.query.organizationId || req.organizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'organizationId is required' });
    }

    const query = { organization: orgId };

    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    if (req.query.status) {
      if (req.query.status.includes(',')) {
        query.status = { $in: req.query.status.split(',') };
      } else {
        query.status = req.query.status;
      }
    }

    if (req.query.priority) {
      if (req.query.priority.includes(',')) {
        query.priority = { $in: req.query.priority.split(',') };
      } else {
        query.priority = req.query.priority;
      }
    }

    if (req.query.assignee) {
      if (req.query.assignee === 'unassigned') {
        query.assignee = null;
      } else {
        query.assignee = req.query.assignee;
      }
    }

    if (req.query.labels) {
      const labelsList = req.query.labels.split(',').map((l) => l.trim());
      query.labels = { $in: labelsList };
    }

    if (req.query.dueBefore || req.query.dueAfter) {
      query.dueDate = {};
      if (req.query.dueAfter) query.dueDate.$gte = new Date(req.query.dueAfter);
      if (req.query.dueBefore) query.dueDate.$lte = new Date(req.query.dueBefore);
    }

    if (req.query.createdBefore || req.query.createdAfter) {
      query.createdAt = {};
      if (req.query.createdAfter) query.createdAt.$gte = new Date(req.query.createdAfter);
      if (req.query.createdBefore) query.createdAt.$lte = new Date(req.query.createdBefore);
    }

    const search = req.query.search || req.query.q;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .select('title description status priority assignee dueDate labels attachments project organization createdBy createdAt updatedAt')
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private (Org Members)
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name description')
      .lean();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.organization.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ message: 'Forbidden: Access denied to task from another organization' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task (field-by-field audit logging for changes ONLY)
// @route   PUT /api/tasks/:id
// @access  Private (MEMBER - assigned only, ADMIN, OWNER)
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.organization.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ message: 'Forbidden: Access denied to task from another organization' });
    }

    // Role enforcement
    const userRole = req.orgRole;
    if (userRole === 'VIEWER') {
      return res.status(403).json({ message: 'Forbidden: Viewers cannot edit tasks' });
    }

    if (userRole === 'MEMBER') {
      const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
      const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
      if (!isAssignee && !isCreator) {
        return res.status(403).json({ message: 'Forbidden: Members can only edit tasks assigned to them' });
      }
    }

    const { title, description, status, priority, assignee, dueDate, labels, attachments } = req.body;
    const oldTaskState = task.toObject();
    const io = req.app.get('io');

    // Track field-by-field audit entries
    const auditEntries = [];

    // 1. Status change
    if (status !== undefined && status !== oldTaskState.status) {
      auditEntries.push({
        action: 'TASK_STATUS_CHANGE',
        oldValue: oldTaskState.status,
        newValue: status,
      });
      task.status = status;

      // Notify assignee & creator of status change
      const notifyTargets = new Set();
      if (task.assignee) notifyTargets.add(task.assignee.toString());
      if (task.createdBy) notifyTargets.add(task.createdBy.toString());
      notifyTargets.delete(req.user._id.toString());

      for (const targetId of notifyTargets) {
        await createNotification({
          user: targetId,
          organization: task.organization,
          type: 'STATUS_CHANGE',
          message: `Task "${task.title}" status changed to ${status}`,
          entityId: task._id,
          io,
        });
      }
    }

    // 2. Priority change
    if (priority !== undefined && priority !== oldTaskState.priority) {
      auditEntries.push({
        action: 'TASK_PRIORITY_CHANGE',
        oldValue: oldTaskState.priority,
        newValue: priority,
      });
      task.priority = priority;
    }

    // 3. Assignee change
    if (assignee !== undefined) {
      const oldAssigneeStr = oldTaskState.assignee ? oldTaskState.assignee.toString() : null;
      const newAssigneeStr = assignee ? assignee.toString() : null;
      if (oldAssigneeStr !== newAssigneeStr) {
        const oldName = await resolveUserName(oldAssigneeStr);
        const newName = await resolveUserName(newAssigneeStr);

        auditEntries.push({
          action: 'TASK_ASSIGNEE_CHANGE',
          oldValue: oldName,
          newValue: newName,
        });
        task.assignee = assignee || null;

        // Notify new assignee
        if (assignee && assignee.toString() !== req.user._id.toString()) {
          await createNotification({
            user: assignee,
            organization: task.organization,
            type: 'TASK_ASSIGNED',
            message: `You were assigned to task "${task.title}"`,
            entityId: task._id,
            io,
          });
        }
      }
    }

    // 4. Due Date change
    if (dueDate !== undefined) {
      const oldDateStr = formatDateStr(oldTaskState.dueDate);
      const newDateStr = formatDateStr(dueDate);
      if (oldDateStr !== newDateStr) {
        auditEntries.push({
          action: 'TASK_DUE_DATE_CHANGE',
          oldValue: oldDateStr,
          newValue: newDateStr,
        });
        task.dueDate = dueDate || null;
      }
    }

    // 5. Labels change
    if (labels !== undefined) {
      const newLabels = Array.isArray(labels) ? labels : labels ? labels.split(',').map((l) => l.trim()) : [];
      const oldLabelsStr = (oldTaskState.labels || []).join(',');
      const newLabelsStr = newLabels.join(',');
      if (oldLabelsStr !== newLabelsStr) {
        auditEntries.push({
          action: 'TASK_LABELS_CHANGE',
          oldValue: oldTaskState.labels || [],
          newValue: newLabels,
        });
        task.labels = newLabels;
      }
    }

    // 6. Attachments change
    if (attachments !== undefined) {
      const oldAttStr = JSON.stringify(oldTaskState.attachments || []);
      const newAttStr = JSON.stringify(attachments || []);
      if (oldAttStr !== newAttStr) {
        auditEntries.push({
          action: 'TASK_ATTACHMENT_CHANGE',
          oldValue: (oldTaskState.attachments || []).length,
          newValue: (attachments || []).length,
        });
        task.attachments = attachments;
      }
    }

    // 7. Title change
    if (title !== undefined && title !== oldTaskState.title) {
      auditEntries.push({
        action: 'TASK_UPDATE',
        oldValue: oldTaskState.title,
        newValue: title,
      });
      task.title = title;
    }

    // 8. Description change
    if (description !== undefined && description !== oldTaskState.description) {
      auditEntries.push({
        action: 'TASK_UPDATE',
        oldValue: oldTaskState.description,
        newValue: description,
      });
      task.description = description;
    }

    // Save task if modified
    await task.save();

    // Log audit ONLY for fields that actually changed
    for (const entry of auditEntries) {
      await logAudit({
        user: req.user._id,
        organization: task.organization,
        action: entry.action,
        entity: 'TASK',
        entityId: task._id,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
      });
    }

    const updatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .lean();

    // Socket.IO emission to project room
    if (io) {
      io.to(`project:${task.project.toString()}`).emit('task:updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (ADMIN, OWNER)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.organization.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ message: 'Forbidden: Access denied to task from another organization' });
    }

    if (!['ADMIN', 'OWNER'].includes(req.orgRole)) {
      return res.status(403).json({ message: 'Forbidden: Only ADMIN and OWNER can delete tasks' });
    }

    const projectId = task.project.toString();
    const orgId = task.organization.toString();

    await Task.findByIdAndDelete(task._id);

    const io = req.app.get('io');

    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'TASK_DELETE',
      entity: 'TASK',
      entityId: task._id,
      oldValue: task.title,
      newValue: null,
    });

    if (io) {
      io.to(`project:${projectId}`).emit('task:deleted', { taskId: task._id, projectId });
    }

    res.json({ message: 'Task deleted successfully', id: task._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get activity / audit history for a specific task
// @route   GET /api/tasks/:id/activity
// @access  Private (Org Members)
const getTaskActivity = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId).select('organization').lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.organization.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ message: 'Forbidden: Access denied to task from another organization' });
    }

    const AuditLog = require('../models/AuditLog');
    const activities = await AuditLog.find({
      entity: 'TASK',
      entityId: taskId,
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskActivity,
};
