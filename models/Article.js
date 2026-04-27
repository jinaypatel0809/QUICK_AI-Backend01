import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  length: {
    type: Number,
    required: true,
  },
  lengthLabel: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  wordCount: {
    type: Number,
  },
  userId: {
    type: String,
    default: 'anonymous',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Article = mongoose.model('Article', articleSchema);

export default Article;