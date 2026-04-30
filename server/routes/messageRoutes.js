const express = require("express");
const {
  getChatHistory,
  sendMessage,
  getConversationList,
  markMessagesAsRead,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/conversations/list", protect, getConversationList);
router.get("/:user1/:user2", protect, getChatHistory);
router.get("/:userId", protect, getChatHistory);
router.post("/", protect, sendMessage);
router.patch("/read/:userId", protect, markMessagesAsRead);

module.exports = router;

