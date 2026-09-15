import { getSamplePdfBuffer } from './samples.js';

export interface EphemeralDocument {
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
  sampleKey?: string;
  createdAt: number;
}

const documentStore = new Map<string, EphemeralDocument>();

// Periodic garbage collection for memory entries older than 24h
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  for (const [id, doc] of documentStore.entries()) {
    if (now - doc.createdAt > maxAge) {
      documentStore.delete(id);
    }
  }
}, 60 * 60 * 1000);

export function saveEphemeralDoc(
  id: string,
  buffer: Buffer,
  mimeType: string,
  originalFilename: string,
  sampleKey?: string
): void {
  documentStore.set(id, {
    buffer,
    mimeType,
    originalFilename,
    sampleKey,
    createdAt: Date.now()
  });
}

export function getEphemeralDoc(id: string): EphemeralDocument | null {
  const doc = documentStore.get(id);
  if (doc) return doc;
  return null;
}

export function deleteEphemeralDoc(id: string): void {
  documentStore.delete(id);
}
