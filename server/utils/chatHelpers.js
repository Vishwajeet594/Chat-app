const Chat = require("../models/Chat");

const populateChat = (query) =>
  query
    .populate("participants", "name email isOnline lastSeen")
    .populate("admins", "name email")
    .populate({
      path: "latestMessage",
      populate: {
        path: "senderId",
        select: "name email",
      },
    });

const getDirectChat = async (userId, otherUserId) => {
  return Chat.findOne({
    isGroupChat: false,
    participants: { $all: [userId, otherUserId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });
};

const getOrCreateDirectChat = async (userId, otherUserId) => {
  let chat = await getDirectChat(userId, otherUserId);

  if (!chat) {
    chat = await Chat.create({
      name: "",
      isGroupChat: false,
      participants: [userId, otherUserId],
      admins: [userId],
      createdBy: userId,
    });
  }

  return populateChat(Chat.findById(chat._id));
};

module.exports = {
  getDirectChat,
  getOrCreateDirectChat,
  populateChat,
};

