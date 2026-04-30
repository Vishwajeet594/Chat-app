const express = require("express");
const { getChatHistory, getConversationList } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/conversations/list", protect, getConversationList);
router.get("/:userId", protect, getChatHistory);

module.exports = router;

