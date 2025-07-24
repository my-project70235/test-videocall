const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  url: { type: String },
  type: { type: String }, // e.g., "image", "video", "file"
  filename: { type: String },
  size: { type: Number }
}, { _id: false }); // prevents extra _id in subdoc

const chatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: { type: String },
  media: mediaSchema, // ✅ nested media field
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", chatSchema);
