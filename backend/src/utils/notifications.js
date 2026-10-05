const Notification = require('../models/Notification');

let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

/**
 * Helper to create a notification in DB and emit via Socket.IO
 */
const createNotification = async ({ user, organization, type, message, entityId = null, io = null }) => {
  try {
    if (!user || !organization || !type || !message) return null;

    const notification = await Notification.create({
      user,
      organization,
      type,
      message,
      entityId,
      read: false,
    });

    const activeIo = io || ioInstance;
    if (activeIo) {
      activeIo.to(`user:${user.toString()}`).emit('notification:new', notification);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { createNotification, setSocketIO };
