const express = require("express");
const {
  getChats,
  createOrGetDirectChat,
  createGroupChat,
  addGroupMembers,
  removeGroupMember,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getChats);
router.get("/conversations/list", protect, getChats);
router.post("/direct", protect, createOrGetDirectChat);
router.post("/group", protect, createGroupChat);
router.patch("/:chatId/members", protect, addGroupMembers);
router.delete("/:chatId/members/:memberId", protect, removeGroupMember);

module.exports = router;
