const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { getOrCreateDirectChat, populateChat } = require("../utils/chatHelpers");

const buildChatSummary = async (chat, currentUserId) => {
  const unreadCount = await Message.countDocuments({
    chatId: chat._id,
    senderId: { $ne: currentUserId },
    seenBy: { $nin: [currentUserId] },
  });

  return {
    _id: chat._id,
    name: chat.isGroupChat
      ? chat.name
      : chat.participants.find((participant) => participant._id.toString() !== currentUserId.toString())
          ?.name || "Direct Chat",
    isGroupChat: chat.isGroupChat,
    participants: chat.participants,
    admins: chat.admins,
    latestMessage: chat.latestMessage,
    unreadCount,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
};

const getChats = async (req, res) => {
  try {
    const chats = await populateChat(
      Chat.find({
        participants: req.user._id,
      }).sort({ updatedAt: -1 })
    );

    const formattedChats = await Promise.all(
      chats.map((chat) => buildChatSummary(chat, req.user._id))
    );

    return res.status(200).json(formattedChats);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch chats" });
  }
};

const createOrGetDirectChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "A userId is required" });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot create a chat with yourself" });
    }

    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const chat = await getOrCreateDirectChat(req.user._id, userId);
    const summary = await buildChatSummary(chat, req.user._id);

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create chat" });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;

    const uniqueIds = [...new Set([req.user._id.toString(), ...memberIds])];

    if (!name || uniqueIds.length < 3) {
      return res
        .status(400)
        .json({ message: "Group name and at least 2 other members are required" });
    }

    const chat = await Chat.create({
      name: name.trim(),
      isGroupChat: true,
      participants: uniqueIds,
      admins: [req.user._id],
      createdBy: req.user._id,
    });

    const populatedChat = await populateChat(Chat.findById(chat._id));
    const summary = await buildChatSummary(populatedChat, req.user._id);

    return res.status(201).json(summary);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create group chat" });
  }
};

const addGroupMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { memberIds = [] } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (!chat.admins.some((adminId) => adminId.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Only group admins can add members" });
    }

    const participantIds = new Set(chat.participants.map((item) => item.toString()));
    memberIds.forEach((memberId) => participantIds.add(memberId));
    chat.participants = Array.from(participantIds);
    await chat.save();

    const populatedChat = await populateChat(Chat.findById(chat._id));
    const summary = await buildChatSummary(populatedChat, req.user._id);

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add group members" });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const { chatId, memberId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (!chat.admins.some((adminId) => adminId.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Only group admins can remove members" });
    }

    chat.participants = chat.participants.filter(
      (participantId) => participantId.toString() !== memberId
    );
    chat.admins = chat.admins.filter((adminId) => adminId.toString() !== memberId);
    await chat.save();

    const populatedChat = await populateChat(Chat.findById(chat._id));
    const summary = await buildChatSummary(populatedChat, req.user._id);

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove group member" });
  }
};

module.exports = {
  getChats,
  createOrGetDirectChat,
  createGroupChat,
  addGroupMembers,
  removeGroupMember,
};
