const jwt = require('jsonwebtoken');
const User = require('../models/User');

const setupSockets = (io) => {
  // Socket auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tasknest_super_secret_jwt_key_2026_safe_and_secure');
      const user = await User.findById(decoded.id).select('-password').lean();

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user._id})`);

    // Auto-join user room: user:<id>
    socket.join(`user:${socket.user._id.toString()}`);

    // Room join/leave handlers
    socket.on('join:project', (projectId) => {
      if (projectId) {
        const room = `project:${projectId}`;
        socket.join(room);
        console.log(`Socket ${socket.user._id} joined room ${room}`);
      }
    });

    socket.on('leave:project', (projectId) => {
      if (projectId) {
        const room = `project:${projectId}`;
        socket.leave(room);
        console.log(`Socket ${socket.user._id} left room ${room}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user._id}`);
    });
  });
};

module.exports = { setupSockets };
