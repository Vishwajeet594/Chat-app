const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

const getChatHistory = async (req, res) => {
  try {
    const authUserId = req.user._id.toString();
    const otherUserId = req.params.userId || req.params.user2;
    const firstUserId = req.params.user1;

    let senderId = authUserId;
    let receiverId = otherUserId;

    if (firstUserId && req.params.user2) {
      const ids = [req.params.user1, req.params.user2];

      if (!ids.includes(authUserId)) {
        return res.status(403).json({ message: "You can only access your own chats" });
      }

      senderId = req.params.user1;
      receiverId = req.params.user2;
    }

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({ message: "Receiver and message are required" });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const newMessage = await Message.create({
      senderId: req.user._id,
      receiverId,
      message: message.trim(),
    });

    return res.status(201).json(newMessage);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message" });
  }
};

const getConversationList = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [{ $eq: ["$senderId", currentUserId] }, "$receiverId", "$senderId"],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$otherUserId",
          lastMessage: { $first: "$message" },
          lastMessageTime: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", currentUserId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          user: {
            _id: "$user._id",
            name: "$user.name",
            email: "$user.email",
            isOnline: "$user.isOnline",
            lastSeen: "$user.lastSeen",
          },
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    return res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update messages" });
  }
};

module.exports = {
  getChatHistory,
  sendMessage,
  getConversationList,
  markMessagesAsRead,
};

