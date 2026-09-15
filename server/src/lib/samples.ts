import fs from 'fs';
import path from 'path';

export interface SampleDocMeta {
  key: string;
  title: string;
  filename: string;
  description: string;
  fileType: string;
  category: string;
}

export const SAMPLE_DOCUMENTS: Record<string, SampleDocMeta> = {
  solar: {
    key: 'solar',
    title: 'National Rooftop Solar Subsidy Guidelines',
    filename: 'govt-solar-circular.pdf',
    description: 'Government circular detailing 40% solar subsidies, eligibility limits, DISCOM net-metering, and application deadlines.',
    fileType: 'application/pdf',
    category: 'Government Circular'
  },
  lease: {
    key: 'lease',
    title: 'Standard Residential Tenancy Agreement',
    filename: 'residential-lease-agreement.pdf',
    description: '11-month Bangalore residential lease covering ₹32k rent, ₹1.5L deposit refund terms, maintenance dues, and notice periods.',
    fileType: 'application/pdf',
    category: 'Rental Agreement'
  },
  tos: {
    key: 'tos',
    title: 'CloudForge SaaS Terms of Service',
    filename: 'saas-terms-of-service.pdf',
    description: 'Developer platform terms specifying 99.9% uptime SLA credits, billing terms, liability caps, and data privacy.',
    fileType: 'application/pdf',
    category: 'Terms of Service'
  }
};

export function getSamplePdfBuffer(key: string): { buffer: Buffer; meta: SampleDocMeta } | null {
  const meta = SAMPLE_DOCUMENTS[key];
  if (!meta) return null;

  const candidatePaths = [
    path.resolve(process.cwd(), '../attached_assets', meta.filename),
    path.resolve(process.cwd(), 'attached_assets', meta.filename),
    path.resolve(__dirname, '../../../attached_assets', meta.filename),
    path.resolve(__dirname, '../../attached_assets', meta.filename),
    path.resolve(__dirname, '../../../client/public/samples', meta.filename),
    path.resolve(__dirname, '../../../client/dist/samples', meta.filename),
    path.resolve(__dirname, '../../client/dist/samples', meta.filename),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return { buffer: fs.readFileSync(p), meta };
    }
  }

  return null;
}
