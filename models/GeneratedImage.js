import mongoose from 'mongoose';


const generatedImageSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true,
  },
  style: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  publish: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: String,
    default: 'anonymous',
  },
  userName: {
    type: String,
    default: 'User',
  },
  likes: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const GeneratedImage = mongoose.model('GeneratedImage', generatedImageSchema);

export default GeneratedImage;