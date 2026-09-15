import mongoose, { Schema, Document as MongooseDoc } from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doctoaction';

export interface IDocument {
  _id: string;
  sessionId: string;
  originalFilename: string;
  fileType: string;
  status: 'uploading' | 'reading' | 'writing' | 'ready' | 'error';
  statusMessage?: string;
  isSample: boolean;
  sampleKey?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ISummary {
  _id: string;
  documentId: string;
  summaryText: string;
  translatedSummary?: string;
  keyPoints: {
    eligibility: string[];
    obligations: string[];
    deadlines: string[];
  };
  translatedKeyPoints?: {
    eligibility: string[];
    obligations: string[];
    deadlines: string[];
  };
  createdAt: Date;
}

export interface IMessage {
  _id: string;
  documentId: string;
  role: 'user' | 'assistant';
  content: string;
  translatedContent?: string;
  isVoice?: boolean;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  _id: { type: String, required: true },
  sessionId: { type: String, required: true, index: true },
  originalFilename: { type: String, required: true },
  fileType: { type: String, required: true },
  status: {
    type: String,
    enum: ['uploading', 'reading', 'writing', 'ready', 'error'],
    default: 'uploading'
  },
  statusMessage: { type: String },
  isSample: { type: Boolean, default: false },
  sampleKey: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// TTL Index on expiresAt: automatically deleted after 24h
DocumentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SummarySchema = new Schema<ISummary>({
  _id: { type: String, required: true },
  documentId: { type: String, required: true, unique: true, index: true },
  summaryText: { type: String, required: true },
  translatedSummary: { type: String },
  keyPoints: {
    eligibility: [{ type: String }],
    obligations: [{ type: String }],
    deadlines: [{ type: String }]
  },
  translatedKeyPoints: {
    eligibility: [{ type: String }],
    obligations: [{ type: String }],
    deadlines: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now }
});

// TTL Index on createdAt: expire after 24 hours (86400 seconds)
SummarySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const MessageSchema = new Schema<IMessage>({
  _id: { type: String, required: true },
  documentId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  translatedContent: { type: String },
  isVoice: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// TTL Index on createdAt: expire after 24 hours (86400 seconds)
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
export const SummaryModel = mongoose.model<ISummary>('Summary', SummarySchema);
export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema);

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('Successfully connected to MongoDB Atlas!');

    // Ensure TTL indexes are created
    await Promise.all([
      DocumentModel.createIndexes(),
      SummaryModel.createIndexes(),
      MessageModel.createIndexes()
    ]);
    console.log('MongoDB TTL indexes confirmed.');
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    throw error;
  }
}
