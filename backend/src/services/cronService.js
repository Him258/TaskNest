const cron = require('node-cron');
const Task = require('../models/Task');
const { createNotification } = require('../utils/notifications');

const checkDeadlines = async (io) => {
  console.log('[Cron Job] Checking for approaching task deadlines...');
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasksDueSoon = await Task.find({
      dueDate: { $gte: now, $lte: in24Hours },
      status: { $ne: 'DONE' },
      deadlineNotified: { $ne: true },
      assignee: { $ne: null },
    }).lean();

    for (const task of tasksDueSoon) {
      if (task.assignee) {
        await createNotification({
          user: task.assignee,
          organization: task.organization,
          type: 'DEADLINE_APPROACHING',
          message: `Task "${task.title}" is due within 24 hours!`,
          entityId: task._id,
          io,
        });

        await Task.findByIdAndUpdate(task._id, { deadlineNotified: true });
      }
    }
    if (tasksDueSoon.length > 0) {
      console.log(`[Cron Job] Sent ${tasksDueSoon.length} deadline notifications.`);
    }
    return tasksDueSoon.length;
  } catch (error) {
    console.error('[Cron Job] Error checking task deadlines:', error.message);
    return 0;
  }
};

const initCron = (io) => {
  // Run hourly (at minute 0 of every hour)
  cron.schedule('0 * * * *', () => checkDeadlines(io));
  console.log('[Cron Job] Initialized hourly deadline check.');
};

module.exports = { initCron, checkDeadlines };
