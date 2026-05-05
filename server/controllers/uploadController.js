const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });

    stream.end(fileBuffer);
  });

const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A file is required" });
    }

    const resourceType = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("audio/")
        ? "video"
        : "raw";

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "mern-chat-app",
      resource_type: resourceType,
    });

    return res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      messageType: req.file.mimetype.startsWith("image/")
        ? "image"
        : req.file.mimetype.startsWith("audio/")
          ? "audio"
          : "file",
    });
  } catch (error) {
    return res.status(500).json({ message: "File upload failed" });
  }
};

module.exports = { upload, uploadAttachment };

