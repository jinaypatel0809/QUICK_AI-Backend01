import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const chatSchema = new mongoose.Schema({
  // ✅ FIX: sessionId field REMOVED — MongoDB _id itself is the session identifier
  // Pahela "sessionId is required" error aavtu hatu kyarek server.js ma set nathtu

  userId: {
    type: String,
    required: true,   // Clerk user ID — har session ek user saathe linked
    index: true,
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatSession = mongoose.model('ChatSession', chatSchema);

export default ChatSession;