const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const userSockets = new Map();

const addUserSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }

  userSockets.get(userId).add(socketId);
};

const removeUserSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) {
    return;
  }

  const sockets = userSockets.get(userId);
  sockets.delete(socketId);

  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
};

const getOnlineUserIds = () => Array.from(userSockets.keys());

const emitPresence = (io) => {
  io.emit("online-users", getOnlineUserIds());
};

const setupSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    addUserSocket(userId, socket.id);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
    });

    socket.emit("user-online", { userId });
    emitPresence(io);

    socket.on("send-message", async ({ receiverId, message }) => {
      if (!receiverId || !message || !message.trim()) {
        return;
      }

      try {
        const newMessage = await Message.create({
          senderId: userId,
          receiverId,
          message: message.trim(),
        });

        const payload = {
          _id: newMessage._id,
          senderId: newMessage.senderId,
          receiverId: newMessage.receiverId,
          message: newMessage.message,
          isRead: newMessage.isRead,
          createdAt: newMessage.createdAt,
          updatedAt: newMessage.updatedAt,
        };

        socket.emit("message-sent", payload);

        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets) {
          receiverSockets.forEach((receiverSocketId) => {
            io.to(receiverSocketId).emit("receive-message", payload);
          });
        }
      } catch (error) {
        socket.emit("message-error", { message: "Failed to send message" });
      }
    });

    socket.on("mark-as-read", async ({ userId: senderId }) => {
      if (!senderId) {
        return;
      }

      await Message.updateMany(
        {
          senderId,
          receiverId: userId,
          isRead: false,
        },
        {
          $set: { isRead: true },
        }
      );

      const senderSockets = userSockets.get(senderId);
      if (senderSockets) {
        senderSockets.forEach((senderSocketId) => {
          io.to(senderSocketId).emit("messages-read", { by: userId });
        });
      }
    });

    socket.on("disconnect", async () => {
      removeUserSocket(userId, socket.id);

      if (!userSockets.has(userId)) {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user-offline", {
          userId,
          lastSeen: new Date(),
        });
      }

      emitPresence(io);
    });
  });
};

module.exports = setupSocket;

