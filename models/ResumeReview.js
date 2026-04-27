import mongoose from 'mongoose';

const resumeReviewSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  strengths: {
    type: [String],
    default: [],
  },
  improvements: {
    type: [String],
    default: [],
  },
  suggestions: {
    type: [String],
    default: [],
  },
  summary: {
    type: String,
    required: true,
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ResumeReview = mongoose.model('ResumeReview', resumeReviewSchema);

export default ResumeReview;