import mongoose from 'mongoose';

const RemovedBackgroundSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,   // Cloudinary / S3 URL
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

const RemovedBackground = mongoose.model('RemovedBackground', RemovedBackgroundSchema);



export default RemovedBackground;