const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("-password")
      .sort({ name: 1 });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

module.exports = { getUsers };

