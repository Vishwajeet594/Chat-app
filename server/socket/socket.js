const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { getOrCreateDirectChat } = require("../utils/chatHelpers");
const { formatMessage } = require("../controllers/messageController");

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

const emitToUser = (io, userId, eventName, payload) => {
  const sockets = userSockets.get(userId.toString());

  if (!sockets) {
    return;
  }

  sockets.forEach((socketId) => {
    io.to(socketId).emit(eventName, payload);
  });
};

const joinExistingRooms = async (socket, userId) => {
  const chats = await Chat.find({ participants: userId }).select("_id");

  chats.forEach((chat) => {
    socket.join(`chat:${chat._id}`);
  });
};

const syncDeliveredMessages = async (io, userId) => {
  const pendingMessages = await Message.find({
    receiverId: userId,
    status: "sent",
  }).populate("senderId", "name email");

  await Promise.all(
    pendingMessages.map(async (message) => {
      message.status = "delivered";
      if (!message.deliveredTo.some((item) => item.toString() === userId.toString())) {
        message.deliveredTo.push(userId);
      }
      await message.save();
      emitToUser(io, message.senderId._id.toString(), "message-status-updated", {
        messageId: message._id,
        chatId: message.chatId,
        status: "delivered",
      });
    })
  );
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
    const userId = socket.userId.toString();
    addUserSocket(userId, socket.id);
    await joinExistingRooms(socket, userId);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
    });

    await syncDeliveredMessages(io, userId);

    socket.emit("user-online", { userId });
    emitPresence(io);

    socket.on("join-chat", ({ chatId }) => {
      if (chatId) {
        socket.join(`chat:${chatId}`);
      }
    });

    socket.on("typing-start", ({ chatId }) => {
      if (!chatId) {
        return;
      }

      socket.to(`chat:${chatId}`).emit("typing-start", {
        chatId,
        userId,
      });
    });

    socket.on("typing-stop", ({ chatId }) => {
      if (!chatId) {
        return;
      }

      socket.to(`chat:${chatId}`).emit("typing-stop", {
        chatId,
        userId,
      });
    });

    socket.on("send-message", async (payload) => {
      try {
        const {
          chatId,
          receiverId,
          message = "",
          messageType = "text",
          attachments = [],
        } = payload;

        if (!chatId && !receiverId) {
          return;
        }

        if (!message.trim() && attachments.length === 0) {
          return;
        }

        let chat = chatId ? await Chat.findById(chatId) : null;

        if (!chat && receiverId) {
          chat = await getOrCreateDirectChat(userId, receiverId);
        }

        if (!chat) {
          socket.emit("message-error", { message: "Chat not found" });
          return;
        }

        const isDirectChat = !chat.isGroupChat;
        const receiverIsOnline = receiverId && userSockets.has(receiverId.toString());

        const newMessage = await Message.create({
          chatId: chat._id,
          senderId: userId,
          receiverId: isDirectChat ? receiverId : null,
          message: message.trim(),
          messageType,
          attachments,
          status: isDirectChat && receiverIsOnline ? "delivered" : "sent",
          deliveredTo: isDirectChat && receiverIsOnline ? [userId, receiverId] : [userId],
          seenBy: [userId],
        });

        chat.latestMessage = newMessage._id;
        await chat.save();

        const populatedMessage = await Message.findById(newMessage._id).populate(
          "senderId",
          "name email"
        );
        const formattedMessage = formatMessage(populatedMessage);

        socket.join(`chat:${chat._id}`);

        if (receiverId) {
          const targetSockets = userSockets.get(receiverId.toString());
          if (targetSockets) {
            targetSockets.forEach((receiverSocketId) => {
              io.sockets.sockets.get(receiverSocketId)?.join(`chat:${chat._id}`);
            });
          }
        }

        io.to(`chat:${chat._id}`).emit("new-message", formattedMessage);
        io.to(`chat:${chat._id}`).emit("chat-updated", { chatId: chat._id });

        chat.participants
          .map((participant) => participant._id?.toString() || participant.toString())
          .filter((participantId) => participantId !== userId)
          .forEach((participantId) => {
            emitToUser(io, participantId, "chat-notification", {
              chatId: chat._id,
              message: formattedMessage,
            });
          });

        socket.emit("message-status-updated", {
          messageId: newMessage._id,
          chatId: chat._id,
          status: newMessage.status,
        });
      } catch (error) {
        socket.emit("message-error", { message: "Failed to send message" });
      }
    });

    socket.on("mark-chat-seen", async ({ chatId }) => {
      if (!chatId) {
        return;
      }

      const chat = await Chat.findById(chatId);

      if (!chat) {
        return;
      }

      const messages = await Message.find({
        chatId,
        senderId: { $ne: userId },
        seenBy: { $nin: [userId] },
      });

      const updatedIds = [];

      await Promise.all(
        messages.map(async (message) => {
          if (!message.seenBy.some((item) => item.toString() === userId)) {
            message.seenBy.push(userId);
          }
          message.isRead = true;
          if (!chat.isGroupChat) {
            message.status = "seen";
          }
          updatedIds.push(message._id);
          await message.save();
        })
      );

      io.to(`chat:${chatId}`).emit("messages-seen", {
        chatId,
        userId,
        messageIds: updatedIds,
      });
    });

    socket.on("react-message", async ({ messageId, emoji }) => {
      if (!messageId || !emoji) {
        return;
      }

      const message = await Message.findById(messageId).populate("senderId", "name email");

      if (!message) {
        return;
      }

      const existingReaction = message.reactions.find(
        (reaction) => reaction.userId.toString() === userId
      );

      if (existingReaction && existingReaction.emoji === emoji) {
        message.reactions = message.reactions.filter(
          (reaction) => reaction.userId.toString() !== userId
        );
      } else if (existingReaction) {
        existingReaction.emoji = emoji;
      } else {
        message.reactions.push({ userId, emoji });
      }

      await message.save();

      io.to(`chat:${message.chatId}`).emit("message-reaction-updated", formatMessage(message));
    });

    socket.on("call-user", ({ toUserId, offer, callType, chatId }) => {
      emitToUser(io, toUserId, "incoming-call", {
        fromUserId: userId,
        offer,
        callType,
        chatId,
      });
    });

    socket.on("answer-call", ({ toUserId, answer, callType, chatId }) => {
      emitToUser(io, toUserId, "call-answered", {
        fromUserId: userId,
        answer,
        callType,
        chatId,
      });
    });

    socket.on("ice-candidate", ({ toUserId, candidate, chatId }) => {
      emitToUser(io, toUserId, "ice-candidate", {
        fromUserId: userId,
        candidate,
        chatId,
      });
    });

    socket.on("end-call", ({ toUserId, chatId }) => {
      emitToUser(io, toUserId, "call-ended", {
        fromUserId: userId,
        chatId,
      });
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
