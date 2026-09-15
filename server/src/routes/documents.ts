import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { DocumentModel, SummaryModel, MessageModel } from '../lib/mongo.js';
import {
  generateDocumentSummary,
  streamChatAnswer,
  transcribeAudio,
  translateToTamil,
  translateSummaryBundle
} from '../lib/gemini.js';
import {
  saveEphemeralDoc,
  getEphemeralDoc,
  deleteEphemeralDoc
} from '../lib/ephemeral.js';
import { SAMPLE_DOCUMENTS, getSamplePdfBuffer } from '../lib/samples.js';

export const documentsRouter = Router();

// Memory-only storage: NEVER write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB cap
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, JPEG, and PNG documents are supported.'));
    }
  }
});

// Audio upload memory storage
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB cap for voice notes
  }
});

// GET /api/samples - List bundled sample documents
documentsRouter.get('/samples', (req: Request, res: Response) => {
  res.json({ samples: Object.values(SAMPLE_DOCUMENTS) });
});

// GET /api/history - Get session history
documentsRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.session_id || 'anonymous';
    const docs = await DocumentModel.find({ sessionId }).sort({ createdAt: -1 }).lean();
    res.json({ documents: docs });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch document history' });
  }
});

// POST /api/documents - Upload document or choose sample
documentsRouter.post('/', (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 20MB limit. Please upload a smaller document.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.session_id || 'anonymous';
    const sampleKey = req.body.sampleKey;

    let buffer: Buffer;
    let mimeType: string;
    let originalFilename: string;
    let isSample = false;

    if (sampleKey) {
      const sample = getSamplePdfBuffer(sampleKey);
      if (!sample) {
        return res.status(404).json({ error: 'Selected sample document was not found.' });
      }
      buffer = sample.buffer;
      mimeType = sample.meta.fileType;
      originalFilename = sample.meta.filename;
      isSample = true;
    } else if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype;
      originalFilename = req.file.originalname;
    } else {
      return res.status(400).json({ error: 'No document file or sample key provided.' });
    }

    const docId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours TTL

    // Save in ephemeral in-memory cache (never to disk)
    saveEphemeralDoc(docId, buffer, mimeType, originalFilename, sampleKey);

    // Save Document record in MongoDB
    const docRecord = await DocumentModel.create({
      _id: docId,
      sessionId,
      originalFilename,
      fileType: mimeType,
      status: 'uploading',
      statusMessage: 'Receiving document into ephemeral memory...',
      isSample,
      sampleKey,
      createdAt: now,
      expiresAt
    });

    // Return document ID immediately
    res.status(201).json({
      documentId: docId,
      status: 'uploading',
      originalFilename,
      isSample
    });

    // Begin background processing asynchronously
    processDocumentAsync(docId, buffer, mimeType);
  } catch (error: any) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize document upload' });
  }
});

// Async background processing pipeline
async function processDocumentAsync(docId: string, buffer: Buffer, mimeType: string) {
  try {
    // Step 1: reading document
    await DocumentModel.updateOne(
      { _id: docId },
      { status: 'reading', statusMessage: 'Reading and analyzing document clauses...' }
    );

    // Call Gemini with in-memory buffer
    const base64Data = buffer.toString('base64');
    const summaryResult = await generateDocumentSummary(mimeType, base64Data);

    // Step 2: writing summary
    await DocumentModel.updateOne(
      { _id: docId },
      { status: 'writing', statusMessage: 'Synthesizing plain-language summary and key points...' }
    );

    // Save Summary in MongoDB
    await SummaryModel.create({
      _id: uuidv4(),
      documentId: docId,
      summaryText: summaryResult.summaryText,
      keyPoints: summaryResult.keyPoints,
      createdAt: new Date()
    });

    // Step 3: ready
    await DocumentModel.updateOne(
      { _id: docId },
      { status: 'ready', statusMessage: 'Analysis complete.' }
    );
  } catch (error: any) {
    console.error(`Document processing failed for ${docId}:`, error);
    await DocumentModel.updateOne(
      { _id: docId },
      {
        status: 'error',
        statusMessage: error.message || 'Failed to process document with Gemini AI.'
      }
    );
  }
}

// Helper to extract id from req.params as string
const getId = (req: Request): string => Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');

// GET /api/documents/:id/status - Real-time SSE status stream
documentsRouter.get('/:id/status', async (req: Request, res: Response) => {
  const id = getId(req);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let lastStatus = '';
  let interval: NodeJS.Timeout | null = null;

  const checkStatus = async () => {
    try {
      const doc = await DocumentModel.findById(id).lean();
      if (!doc) {
        res.write(`data: ${JSON.stringify({ error: 'Document not found' })}\n\n`);
        cleanup();
        return res.end();
      }

      if (doc.status !== lastStatus) {
        lastStatus = doc.status;
        res.write(`data: ${JSON.stringify({
          status: doc.status,
          statusMessage: doc.statusMessage || '',
          originalFilename: doc.originalFilename
        })}\n\n`);
      }

      if (doc.status === 'ready' || doc.status === 'error') {
        cleanup();
        res.end();
      }
    } catch (err) {
      console.error('SSE status check error:', err);
      cleanup();
      res.end();
    }
  };

  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  req.on('close', cleanup);
  interval = setInterval(checkStatus, 500);
  checkStatus(); // Initial immediate check
});

// GET /api/documents/:id - Summary and key points
documentsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const doc = await DocumentModel.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or has expired.' });
    }

    const summary = await SummaryModel.findOne({ documentId: id }).lean();

    res.json({
      document: doc,
      summary: summary ? {
        summaryText: summary.summaryText,
        translatedSummary: summary.translatedSummary,
        keyPoints: summary.keyPoints,
        translatedKeyPoints: summary.translatedKeyPoints,
        createdAt: summary.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error fetching document details:', error);
    res.status(500).json({ error: 'Failed to retrieve document details' });
  }
});

// GET /api/documents/:id/download - Download source PDF (ephemeral memory)
documentsRouter.get('/:id/download', async (req: Request, res: Response) => {
  const id = getId(req);
  const ephemeral = getEphemeralDoc(id);

  if (ephemeral) {
    res.setHeader('Content-Type', ephemeral.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${ephemeral.originalFilename}"`);
    return res.send(ephemeral.buffer);
  }

  // Fallback: try re-reading the sample PDF from disk if this is a sample doc
  try {
    const docRecord = await DocumentModel.findById(id).lean();
    if (docRecord?.isSample && docRecord?.sampleKey) {
      const sample = getSamplePdfBuffer(docRecord.sampleKey);
      if (sample) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${sample.meta.filename}"`);
        return res.send(sample.buffer);
      }
    }
  } catch (_) {
    // ignore lookup errors
  }

  res.status(404).json({ error: 'Document file buffer is no longer in memory. The ephemeral session has expired — please re-upload the document.' });
});

// GET /api/documents/:id/messages - Chat history
documentsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const messages = await MessageModel.find({ documentId: id }).sort({ createdAt: 1 }).lean();
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve message history' });
  }
});

// POST /api/documents/:id/messages - Ask question (text or voice) & stream response
documentsRouter.post('/:id/messages', audioUpload.single('audio'), async (req: Request, res: Response) => {
  const id = getId(req);

  try {
    const doc = await DocumentModel.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found or expired.' });
    }

    const summary = await SummaryModel.findOne({ documentId: id }).lean();
    let questionText = req.body.content || '';
    let isVoice = false;

    // Handle voice upload
    if (req.file) {
      isVoice = true;
      const audioMime = req.file.mimetype || 'audio/webm';
      const base64Audio = req.file.buffer.toString('base64');
      questionText = await transcribeAudio(audioMime, base64Audio);

      if (!questionText) {
        questionText = 'Spoken query (audio received)';
      }
    }

    if (!questionText.trim()) {
      return res.status(400).json({ error: 'No question or audio query provided.' });
    }

    // Save user message to database
    const userMsgId = uuidv4();
    await MessageModel.create({
      _id: userMsgId,
      documentId: id,
      role: 'user',
      content: questionText,
      isVoice,
      createdAt: new Date()
    });

    // Prepare runningContents for Gemini
    const pastMessages = await MessageModel.find({ documentId: id })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    const runningContents: any[] = [];

    // Attach document context into the first prompt
    let ephemeral = getEphemeralDoc(id);
    if (!ephemeral && doc.isSample && doc.sampleKey) {
      const sample = getSamplePdfBuffer(doc.sampleKey);
      if (sample) {
        saveEphemeralDoc(id, sample.buffer, sample.meta.fileType, sample.meta.filename, doc.sampleKey);
        ephemeral = getEphemeralDoc(id);
      }
    }
    let attachedDocPart: any = null;
    if (ephemeral) {
      attachedDocPart = {
        inlineData: {
          mimeType: ephemeral.mimeType,
          data: ephemeral.buffer.toString('base64')
        }
      };
    }

    // Context preamble
    let systemContext = `Document: "${doc.originalFilename}".`;
    if (summary) {
      systemContext += `\nVerified Summary: ${summary.summaryText}`;
    }

    // First user turn with document attached if available
    const firstParts: any[] = [{ text: `Here is the document context:\n${systemContext}` }];
    if (attachedDocPart) {
      firstParts.push(attachedDocPart);
    }

    runningContents.push({
      role: 'user',
      parts: firstParts
    });

    runningContents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will answer all questions strictly from this document, citing relevant clauses and sections.' }]
    });

    // Append prior conversational turns
    for (const msg of pastMessages.slice(0, -1)) {
      runningContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Current question
    runningContents.push({
      role: 'user',
      parts: [{ text: questionText }]
    });

    // Set SSE headers for streaming answer
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // If voice, send immediate transcription event
    if (isVoice) {
      res.write(`event: transcription\ndata: ${JSON.stringify({
        messageId: userMsgId,
        question: questionText
      })}\n\n`);
    }

    const assistantMsgId = uuidv4();

    // Stream the answer
    const fullAnswer = await streamChatAnswer(runningContents, (chunk) => {
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    // Save assistant answer to MongoDB
    await MessageModel.create({
      _id: assistantMsgId,
      documentId: id,
      role: 'assistant',
      content: fullAnswer,
      createdAt: new Date()
    });

    res.write(`event: done\ndata: ${JSON.stringify({
      userMessageId: userMsgId,
      messageId: assistantMsgId,
      question: questionText,
      fullAnswer
    })}\n\n`);

    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to process chat question' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Chat stream failed' })}\n\n`);
      res.end();
    }
  }
});

// POST /api/documents/:id/translate - Translate summary or message to Tamil
documentsRouter.post('/:id/translate', async (req: Request, res: Response) => {
  const id = getId(req);
  const { messageId, isSummary, targetLang = 'ta' } = req.body;

  try {
    if (isSummary) {
      const summary = await SummaryModel.findOne({ documentId: id });
      if (!summary) {
        return res.status(404).json({ error: 'Summary not found' });
      }

      // Check cache first!
      if (summary.translatedSummary) {
        return res.json({
          cached: true,
          translatedSummary: summary.translatedSummary,
          translatedKeyPoints: summary.translatedKeyPoints
        });
      }

      // Translate summary and keypoints in a single structured Gemini call
      const { translatedSummary, translatedKeyPoints } = await translateSummaryBundle(
        summary.summaryText,
        summary.keyPoints
      );

      summary.translatedSummary = translatedSummary;
      summary.translatedKeyPoints = translatedKeyPoints;
      await summary.save();

      return res.json({
        cached: false,
        translatedSummary,
        translatedKeyPoints
      });
    }

    if (messageId) {
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check cache first!
      if (message.translatedContent) {
        return res.json({
          cached: true,
          messageId,
          translatedContent: message.translatedContent
        });
      }

      const translatedContent = await translateToTamil(message.content);
      message.translatedContent = translatedContent;
      await message.save();

      return res.json({
        cached: false,
        messageId,
        translatedContent
      });
    }

    res.status(400).json({ error: 'Please specify either messageId or isSummary: true' });
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message || 'Failed to translate content into Tamil' });
  }
});

// DELETE /api/documents/:id/messages - Clear chat history for document
documentsRouter.delete('/:id/messages', async (req: Request, res: Response) => {
  const id = getId(req);
  try {
    await MessageModel.deleteMany({ documentId: id });
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// DELETE /api/documents/:id - Delete document and associated records
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = getId(req);
  try {
    await Promise.all([
      DocumentModel.deleteOne({ _id: id }),
      SummaryModel.deleteOne({ documentId: id }),
      MessageModel.deleteMany({ documentId: id })
    ]);

    deleteEphemeralDoc(id);
    res.json({ success: true, message: 'Document and associated data deleted.' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});
