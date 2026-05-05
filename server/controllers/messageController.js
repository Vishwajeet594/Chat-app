const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { getDirectChat, getOrCreateDirectChat } = require("../utils/chatHelpers");

const formatMessage = (message) => ({
  _id: message._id,
  chatId: message.chatId,
  senderId: message.senderId?._id || message.senderId,
  sender: message.senderId?.name
    ? {
        _id: message.senderId._id,
        name: message.senderId.name,
        email: message.senderId.email,
      }
    : null,
  receiverId: message.receiverId,
  message: message.message,
  messageType: message.messageType,
  attachments: message.attachments || [],
  reactions: message.reactions || [],
  status: message.status,
  deliveredTo: message.deliveredTo || [],
  seenBy: message.seenBy || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getMessagesByChatId = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat || !chat.participants.some((item) => item.toString() === req.user._id.toString())) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await Message.find({ chatId: chat._id })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages.map(formatMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const authUserId = req.user._id.toString();
    const otherUserId = req.params.userId || req.params.user2;
    const firstUserId = req.params.user1;

    if (firstUserId && req.params.user2 && ![req.params.user1, req.params.user2].includes(authUserId)) {
      return res.status(403).json({ message: "You can only access your own chats" });
    }

    const targetUserId = firstUserId === authUserId ? req.params.user2 : otherUserId;
    const chat = await getDirectChat(authUserId, targetUserId);

    if (!chat) {
      return res.status(200).json([]);
    }

    const messages = await Message.find({ chatId: chat._id })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages.map(formatMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, message = "", messageType = "text", attachments = [] } = req.body;

    if (!chatId && !receiverId) {
      return res.status(400).json({ message: "chatId or receiverId is required" });
    }

    if (!message.trim() && attachments.length === 0) {
      return res.status(400).json({ message: "Message text or attachments are required" });
    }

    let chat = null;

    if (chatId) {
      chat = await Chat.findById(chatId);
    } else {
      chat = await getOrCreateDirectChat(req.user._id, receiverId);
    }

    if (!chat || !chat.participants.some((item) => item.toString() === req.user._id.toString())) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const newMessage = await Message.create({
      chatId: chat._id,
      senderId: req.user._id,
      receiverId: chat.isGroupChat ? null : receiverId,
      message: message.trim(),
      messageType,
      attachments,
      status: "sent",
      deliveredTo: [req.user._id],
      seenBy: [req.user._id],
    });

    chat.latestMessage = newMessage._id;
    await chat.save();

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "name email");
    return res.status(201).json(formatMessage(populatedMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message" });
  }
};

const markChatAsSeen = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat || !chat.participants.some((item) => item.toString() === req.user._id.toString())) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await Message.find({
      chatId,
      senderId: { $ne: req.user._id },
      seenBy: { $nin: [req.user._id] },
    });

    await Promise.all(
      messages.map((message) => {
        message.seenBy.push(req.user._id);
        message.isRead = true;
        message.status = chat.isGroupChat ? message.status : "seen";
        return message.save();
      })
    );

    return res.status(200).json({
      message: "Messages marked as seen",
      messageIds: messages.map((item) => item._id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark messages as seen" });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const chat = await Chat.findById(message.chatId);

    if (!chat || !chat.participants.some((item) => item.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "You do not have access to this message" });
    }

    const existingReaction = message.reactions.find(
      (reaction) => reaction.userId.toString() === req.user._id.toString()
    );

    if (existingReaction && existingReaction.emoji === emoji) {
      message.reactions = message.reactions.filter(
        (reaction) => reaction.userId.toString() !== req.user._id.toString()
      );
    } else if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      message.reactions.push({
        userId: req.user._id,
        emoji,
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id).populate("senderId", "name email");
    return res.status(200).json(formatMessage(populatedMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to react to message" });
  }
};

const getConversationList = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate("participants", "name email isOnline lastSeen")
      .populate("admins", "name email")
      .populate({
        path: "latestMessage",
        populate: {
          path: "senderId",
          select: "name email",
        },
      })
      .sort({ updatedAt: -1 });

    const formattedChats = await Promise.all(
      chats.map(async (chat) => ({
        _id: chat._id,
        name: chat.isGroupChat
          ? chat.name
          : chat.participants.find((participant) => participant._id.toString() !== req.user._id.toString())
              ?.name || "Direct Chat",
        isGroupChat: chat.isGroupChat,
        participants: chat.participants,
        admins: chat.admins,
        latestMessage: chat.latestMessage ? formatMessage(chat.latestMessage) : null,
        unreadCount: await Message.countDocuments({
          chatId: chat._id,
          senderId: { $ne: req.user._id },
          seenBy: { $nin: [req.user._id] },
        }),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      }))
    );

    return res.status(200).json(formattedChats);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

module.exports = {
  formatMessage,
  getMessagesByChatId,
  getChatHistory,
  getConversationList,
  sendMessage,
  markChatAsSeen,
  reactToMessage,
};
