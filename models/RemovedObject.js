import mongoose from 'mongoose';

// ⚠️ MongoDB BSON 16MB limit che — base64 image store karva thi limit exceed thay
// Isliye sirf metadata save kariye, image frontend ne direct return kariye
const removedObjectSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  objectDescription: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RemovedObject = mongoose.model('RemovedObject', removedObjectSchema);

export default RemovedObject;