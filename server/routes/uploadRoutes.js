const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { upload, uploadAttachment } = require("../controllers/uploadController");

const router = express.Router();

router.post("/", protect, upload.single("file"), uploadAttachment);

module.exports = router;

