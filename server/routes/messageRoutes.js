const express = require("express");
const {
  getMessagesByChatId,
  getChatHistory,
  sendMessage,
  getConversationList,
  markChatAsSeen,
  reactToMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/conversations/list", protect, getConversationList);
router.get("/chat/:chatId", protect, getMessagesByChatId);
router.get("/:user1/:user2", protect, getChatHistory);
router.get("/:userId", protect, getChatHistory);
router.post("/", protect, sendMessage);
router.patch("/read/:chatId", protect, markChatAsSeen);
router.patch("/:messageId/reactions", protect, reactToMessage);

module.exports = router;
