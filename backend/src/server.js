const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const connectDB = require('./config/db');
const { setupSockets } = require('./sockets/socketHandler');
const { setSocketIO } = require('./utils/notifications');
const { initCron } = require('./services/cronService');

const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes and origin
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

app.set('io', io);
setSocketIO(io);
setupSockets(io);

// Connect Database
connectDB();

// Initialize Cron Jobs
initCron(io);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TaskNest API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks/:id/comments', commentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
