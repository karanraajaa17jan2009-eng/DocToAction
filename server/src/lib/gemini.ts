import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Robust dotenv resolution
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not defined in environment variables. Gemini AI calls will fail until it is provided.');
}
const CANDIDATE_MODELS = ['gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash'];

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

// Multi-model retry runner: tries primary model, on 429/503/high-demand tries next available flash model
async function runWithModelFallback<T>(
  action: (modelName: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await action(model);
      } catch (err: any) {
        lastError = err;
        const isTemporary = err?.status === 429 || err?.status === 503 || err?.status === 404 ||
          err?.message?.includes('429') || err?.message?.includes('503') ||
          err?.message?.includes('high demand') || err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('not found');

        if (isTemporary) {
          console.warn(`Model ${model} attempt ${attempt} warning (${err?.status || err?.message?.slice(0, 50)}). Retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

export interface SummaryOutput {
  summaryText: string;
  keyPoints: {
    eligibility: string[];
    obligations: string[];
    deadlines: string[];
  };
}

export const SUMMARY_SYSTEM_PROMPT = `
You are Doc-to-Action, an expert legal and administrative document assistant.
Tagline: "Dense paperwork in. Plain answers out."

Read the attached document thoroughly. Write a plain-language summary and extract key structured information strictly grounded in the document.
Rules:
1. Stay strictly grounded in the text of the attached document. Do not invent details or assume policies not stated.
2. Formulate your output as JSON matching the exact schema below.
3. In "summaryText", write 2-3 clear, accessible paragraphs explaining what this document is, who the parties or authorities are, and the critical terms in plain human language, referencing specific clauses or sections where helpful.
4. In "keyPoints.eligibility", list specific qualifications, prerequisites, or criteria required.
5. In "keyPoints.obligations", list mandatory actions, duties, fees, or restrictions imposed on the beneficiary, tenant, or user.
6. In "keyPoints.deadlines", list all specific dates, cutoffs, response windows, lock-ins, or grace periods mentioned.
7. Return raw valid JSON ONLY, without markdown code fences (\`\`\`json).

JSON Schema:
{
  "summaryText": "...",
  "keyPoints": {
    "eligibility": ["...", "..."],
    "obligations": ["...", "..."],
    "deadlines": ["...", "..."]
  }
}
`;

export async function generateDocumentSummary(mimeType: string, base64Data: string): Promise<SummaryOutput> {
  return runWithModelFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: SUMMARY_SYSTEM_PROMPT },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    try {
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned) as SummaryOutput;
      return {
        summaryText: parsed.summaryText || 'No summary could be generated from this document.',
        keyPoints: {
          eligibility: Array.isArray(parsed.keyPoints?.eligibility) ? parsed.keyPoints.eligibility : [],
          obligations: Array.isArray(parsed.keyPoints?.obligations) ? parsed.keyPoints.obligations : [],
          deadlines: Array.isArray(parsed.keyPoints?.deadlines) ? parsed.keyPoints.deadlines : []
        }
      };
    } catch (err) {
      console.error('JSON parse error from Gemini summary:', err);
      return {
        summaryText: responseText || 'Document analyzed successfully.',
        keyPoints: {
          eligibility: ['Review document clauses for specific eligibility conditions.'],
          obligations: ['Follow obligations outlined in the text.'],
          deadlines: ['Check document timeline and dates.']
        }
      };
    }
  });
}

export const CHAT_SYSTEM_INSTRUCTION = `
You are the Doc-to-Action assistant. You answer questions exclusively about the attached document.
Guidelines:
1. Answer only using facts directly stated in the document.
2. Name the specific clause, section, or line number each piece of information is drawn from (e.g., "[Clause 3]", "[Section 2.1]").
3. If the document does not explicitly address the question or provide sufficient information, say: "The attached document does not address this question." Do not guess or infer external facts.
4. Keep explanations concise, clear, and reassuring.
5. Remind the user: "AI-generated — verify before relying on it." when giving critical conclusions.
`;

export async function streamChatAnswer(
  runningContents: any[],
  onChunk: (text: string) => void
): Promise<string> {
  return runWithModelFallback(async (model) => {
    const stream = await ai.models.generateContentStream({
      model,
      contents: runningContents,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
        temperature: 0.2
      }
    });

    let fullAnswer = '';
    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        fullAnswer += text;
        onChunk(text);
      }
    }

    return fullAnswer;
  });
}

export async function transcribeAudio(audioMimeType: string, base64Audio: string): Promise<string> {
  return runWithModelFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Transcribe the spoken audio query verbatim. Output ONLY the transcribed query text as plain text. Do not add punctuation commentary, greetings, or formatting.'
            },
            {
              inlineData: { mimeType: audioMimeType, data: base64Audio }
            }
          ]
        }
      ],
      config: {
        temperature: 0.0
      }
    });

    return (response.text || '').trim();
  });
}

// Single structured call to translate summary and all keypoints into Tamil
export async function translateSummaryBundle(
  summaryText: string,
  keyPoints: { eligibility: string[]; obligations: string[]; deadlines: string[] }
): Promise<{
  translatedSummary: string;
  translatedKeyPoints: { eligibility: string[]; obligations: string[]; deadlines: string[] };
}> {
  return runWithModelFallback(async (model) => {
    const prompt = `
You are an expert legal and administrative Tamil translator.
Translate the following English document summary and structured key points into natural, accurate Tamil.
Rules:
1. Preserve all numbers, percentages (%), dates, and clause/section citations (e.g. Clause 2.1, Section 3).
2. Output JSON strictly matching this schema:
{
  "translatedSummary": "Tamil translation of the summary paragraphs...",
  "translatedKeyPoints": {
    "eligibility": ["Tamil item 1", "..."],
    "obligations": ["Tamil item 1", "..."],
    "deadlines": ["Tamil item 1", "..."]
  }
}
3. Return raw valid JSON ONLY, without markdown fences.

Input to translate:
${JSON.stringify({ summaryText, keyPoints }, null, 2)}
`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const cleaned = (response.text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      translatedSummary: parsed.translatedSummary || '',
      translatedKeyPoints: {
        eligibility: Array.isArray(parsed.translatedKeyPoints?.eligibility) ? parsed.translatedKeyPoints.eligibility : [],
        obligations: Array.isArray(parsed.translatedKeyPoints?.obligations) ? parsed.translatedKeyPoints.obligations : [],
        deadlines: Array.isArray(parsed.translatedKeyPoints?.deadlines) ? parsed.translatedKeyPoints.deadlines : []
      }
    };
  });
}

// Translate single text / message into Tamil
export async function translateToTamil(text: string): Promise<string> {
  return runWithModelFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert legal, government, and technical translator.
Translate the following English text into clear, fluent, and precise Tamil.
Important instructions:
- Preserve all numbers, percentages, currency symbols, dates, and clause/section citations (e.g. Clause 2.1, Section 3).
- Preserve all Markdown layout, bullet points, headers, and line breaks.
- Return ONLY the translated Tamil text without conversational remarks.

Text to translate:
${text}`
            }
          ]
        }
      ],
      config: {
        temperature: 0.1
      }
    });

    return (response.text || '').trim();
  });
}
