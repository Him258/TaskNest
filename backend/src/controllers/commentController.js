const Comment = require('../models/Comment');
const Task = require('../models/Task');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');

// @desc    Add comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private (VIEWER, MEMBER, ADMIN, OWNER - VIEWER can view, but prompt specifies: "VIEWER: view projects, tasks, comments only. MEMBER: create tasks, edit assigned, comment", so MEMBER/ADMIN/OWNER can comment)
const addComment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { text, mentions = [] } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Parse mention user IDs if passed or mentioned by @email
    const mentionedUserIds = new Set(mentions);

    // Regex check for @emails or @names if any
    const emailMatches = text.match(/@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g);
    if (emailMatches) {
      for (const m of emailMatches) {
        const email = m.replace('@', '').toLowerCase();
        const user = await User.findOne({ email }).lean();
        if (user) {
          mentionedUserIds.add(user._id.toString());
        }
      }
    }

    const finalMentions = Array.from(mentionedUserIds);

    const comment = await Comment.create({
      task: taskId,
      user: req.user._id,
      text,
      mentions: finalMentions,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name email')
      .populate('mentions', 'name email')
      .lean();

    const io = req.app.get('io');

    // Send notifications to mentioned users
    for (const mentionedUserId of finalMentions) {
      if (mentionedUserId.toString() !== req.user._id.toString()) {
        await createNotification({
          user: mentionedUserId,
          organization: task.organization,
          type: 'MENTION',
          message: `${req.user.name} mentioned you in a comment on task "${task.title}"`,
          entityId: task._id,
          io,
        });
      }
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a task
// @route   GET /api/tasks/:id/comments
// @access  Private (Org Members)
const getTaskComments = async (req, res) => {
  try {
    const taskId = req.params.id;

    const comments = await Comment.find({ task: taskId })
      .populate('user', 'name email')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addComment,
  getTaskComments,
};
