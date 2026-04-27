import mongoose from 'mongoose';

const removedBackgroundSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  imageBase64: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const removedBackground = mongoose.model('removedBackground', removedBackgroundSchema);



export default removedBackground;