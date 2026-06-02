const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('./logger');

let io = null;
const userSockets = new Map(); // userId -> Set of socketIds (to support multiple tabs)

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin
        ? config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
        : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded; // Store user info (id, role, etc)
      next();
    } catch (err) {
      logger.error(`[socket] Auth failed: ${err.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.sub || socket.user.id;
    const role = socket.user.role;

    logger.info(`[socket] User connected: ${userId} (${role}) - Socket: ${socket.id}`);

    // Join room based on role (e.g., 'admin', 'ngo', 'donor')
    if (role) {
      socket.join(`role:${role}`);
    }

    // Add to mapping
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    socket.on('disconnect', () => {
      logger.info(`[socket] User disconnected: ${userId} - Socket: ${socket.id}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call init(server) first.');
  }
  return io;
}

/**
 * Emit to a specific user
 */
function emitToUser(userId, event, data) {
  const sockets = userSockets.get(String(userId));
  if (sockets && io) {
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    return true;
  }
  return false;
}

/**
 * Emit to everyone with a specific role
 */
function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
    return true;
  }
  return false;
}

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToRole,
};
