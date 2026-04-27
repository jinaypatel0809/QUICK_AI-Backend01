import mongoose from 'mongoose';

const blogTitleSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  titles: {
    type: [String],
    required: true,
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

const BlogTitle = mongoose.model('BlogTitle', blogTitleSchema);

export default BlogTitle;