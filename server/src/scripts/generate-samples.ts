import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateGovtSolarCircular(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1
  let page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Decorative header band
  page.drawRectangle({
    x: 40,
    y: height - 60,
    width: width - 80,
    height: 3,
    color: rgb(0.18, 0.43, 0.38), // Verified green accent
  });

  page.drawText('GOVERNMENT OF INDIA - MINISTRY OF NEW AND RENEWABLE ENERGY', {
    x: 40,
    y: height - 50,
    size: 9,
    font: fontBold,
    color: rgb(0.18, 0.43, 0.38),
  });

  page.drawText('NATIONAL ROOFTOP SOLAR MISSION (PHASE-III)', {
    x: 40,
    y: height - 85,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  page.drawText('Circular No. MNRE/2026/RTS-089  |  Notification Date: 12 January 2026', {
    x: 40,
    y: height - 105,
    size: 10,
    font: fontOblique,
    color: rgb(0.35, 0.38, 0.42),
  });

  page.drawLine({
    start: { x: 40, y: height - 115 },
    end: { x: width - 40, y: height - 115 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.82),
  });

  let y = height - 140;

  const drawHeading = (text: string) => {
    y -= 10;
    page.drawText(text, {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.16),
    });
    y -= 16;
  };

  const drawParagraph = (text: string, indent = 40, fontSize = 9.5) => {
    const maxWidth = width - indent - 45;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const lineWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);
      if (lineWidth > maxWidth) {
        page.drawText(line, { x: indent, y, size: fontSize, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        y -= 14;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: indent, y, size: fontSize, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 16;
    }
  };

  const drawBullet = (text: string) => {
    page.drawCircle({ x: 50, y: y + 3, size: 2, color: rgb(0.91, 0.66, 0.24) });
    drawParagraph(text, 60, 9);
  };

  drawHeading('1. Scope & Objective');
  drawParagraph('This circular establishes operational guidelines for financial grants and central financial assistance (CFA) for grid-connected rooftop solar photovoltaic (PV) installations across domestic residential and agrarian micro-enterprises during financial years 2026-2028.');

  drawHeading('2. Eligibility Criteria for Applicants');
  drawBullet('Clause 2.1: The applicant must possess lawful ownership or a documented long-term registered lease (minimum 10 years remaining) of the residential dwelling.');
  drawBullet('Clause 2.2: The electricity consumer account (CA) number must be strictly designated under the Domestic/Residential tariff category with the local DISCOM, with zero outstanding arrears.');
  drawBullet('Clause 2.3: Total cumulative annual household taxable income must not exceed INR 24,00,000 for Priority Category-A subsidies.');
  drawBullet('Clause 2.4: The installation roof area must be shadow-free with structural load endurance certified by an empanelled civil engineer for at least 15 kg/sq.m.');

  drawHeading('3. Subsidy & Financial Assistance Slabs');
  drawBullet('Tier 1 (Up to 3 kW Capacity): Fixed Central Financial Assistance of 40% calculated on the national benchmark capital cost of INR 60,000 per kW.');
  drawBullet('Tier 2 (Beyond 3 kW and up to 10 kW): 40% for the first 3 kW, and 20% for additional capacity up to 10 kW.');
  drawBullet('Tier 3 (Residential Welfare Associations / Group Housing): Flat 20% CFA up to a maximum aggregated capacity of 500 kW for common facility loads.');

  drawHeading('4. Mandatory Beneficiary Obligations');
  drawBullet('Obligation 4.1 (Bi-directional Metering): Beneficiary must submit a formal application for grid synchronization and install a DISCOM-certified bi-directional net-meter.');
  drawBullet('Obligation 4.2 (Maintenance Warranty): Beneficiary must execute a 5-year Comprehensive Maintenance Contract (CMC) with the authorized vendor.');
  drawBullet('Obligation 4.3 (Data Telemetry): Solar inverter telemetry data must remain online and connected to the National Renewable Energy Portal.');
  drawBullet('Obligation 4.4 (Commercial Restriction): Solar electricity produced cannot be wheeled or sold to private third parties; surplus export is strictly routed to the state DISCOM grid.');

  drawHeading('5. Critical Deadlines and Timelines');
  drawBullet('Deadline 5.1 (Application Cutoff): Online submission on the Unified Solar Portal must be registered before 30 November 2026, 17:00 IST.');
  drawBullet('Deadline 5.2 (Feasibility Sanction): Local DISCOM must communicate technical grid clearance within 21 working days of application receipt.');
  drawBullet('Deadline 5.3 (Commissioning): Installation and trial run must be concluded within 90 calendar days following technical sanction.');
  drawBullet('Deadline 5.4 (Subsidy Disbursement): Direct Benefit Transfer (DBT) shall be credited to the registered bank account within 30 days of inspection certificate issuance.');

  // Footer
  page.drawText('Page 1 of 1  |  Issued by Joint Secretary (Renewable Energy), Govt. of India  |  Fictional Reference Document', {
    x: 40,
    y: 30,
    size: 8,
    font: fontOblique,
    color: rgb(0.5, 0.5, 0.5),
  });

  return Buffer.from(await doc.save());
}

async function generateResidentialLeaseAgreement(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Header
  page.drawText('RESIDENTIAL LEASE AGREEMENT', {
    x: 170,
    y: height - 55,
    size: 15,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  page.drawText('(Standard 11-Month Tenancy Agreement for Karnataka & Urban Metros)', {
    x: 140,
    y: height - 73,
    size: 9.5,
    font: fontOblique,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawLine({
    start: { x: 40, y: height - 85 },
    end: { x: width - 40, y: height - 85 },
    thickness: 1.5,
    color: rgb(0.1, 0.12, 0.16),
  });

  let y = height - 110;

  const drawHeading = (text: string) => {
    y -= 8;
    page.drawText(text, { x: 40, y, size: 10.5, font: fontBold, color: rgb(0.1, 0.12, 0.16) });
    y -= 15;
  };

  const drawParagraph = (text: string, indent = 40) => {
    const maxWidth = width - indent - 40;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      if (fontRegular.widthOfTextAtSize(testLine, 9) > maxWidth) {
        page.drawText(line, { x: indent, y, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        y -= 13;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: indent, y, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 15;
    }
  };

  drawParagraph('THIS AGREEMENT is entered into on 1 October 2026 at Bengaluru, Karnataka, BETWEEN Mr. Rajesh Kumar Varma ("LESSOR/LANDLORD") AND Ms. Ananya Swaminathan ("LESSEE/TENANT").');

  drawHeading('CLAUSE 1: DEMISED PREMISES');
  drawParagraph('The Lessor hereby leases unto the Lessee Flat No. 402, 4th Floor, Lotus Residency, 14th Cross, Indiranagar, Bengaluru 560038, consisting of 2 bedrooms, 2 bathrooms, hall, kitchen, and dedicated covered car parking bay #P-12.');

  drawHeading('CLAUSE 2: LEASE TERM & COMMENCEMENT');
  drawParagraph('The term of this lease shall be for 11 (eleven) months, commencing from 1 October 2026 and expiring on 31 August 2027. Any extension shall require a mutually executed written renewal agreement with renewed stamp duty.');

  drawHeading('CLAUSE 3: MONTHLY RENT & PAYMENT DUE DATE');
  drawParagraph('The Lessee agrees to pay a monthly rent of INR 32,000 (Rupees Thirty-Two Thousand only), payable in advance on or before the 5th calendar day of each month via direct bank NEFT/UPI transfer. A late payment grace fee of INR 250 per day shall apply after the 10th of the month.');

  drawHeading('CLAUSE 4: SECURITY DEPOSIT & REFUND TERMS');
  drawParagraph('The Lessee has deposited an interest-free refundable security deposit of INR 1,50,000 with the Lessor. The deposit shall be returned in full within 15 calendar days of the peaceful handover of the vacant premises, less verified unpaid utility arrears or actual structural repairs beyond reasonable wear and tear.');

  drawHeading('CLAUSE 5: MAINTENANCE, UTILITIES & TAXES');
  drawParagraph('The Lessor shall be responsible for annual property municipal taxes and structural roof/piping repairs. The Lessee shall pay monthly apartment society maintenance dues (INR 3,500), BESCOM electricity bill, and piped domestic LPG consumption according to meter readings.');

  drawHeading('CLAUSE 6: PERMITTED USE & RESTRICTIONS');
  drawParagraph('The premises shall be occupied strictly for lawful private residential purposes by the Tenant and immediate family. Subletting, shared airbnb leasing, keeping pets without prior written consent, and operating commercial business activities on the premises are expressly prohibited.');

  drawHeading('CLAUSE 7: NOTICE PERIOD & EARLY TERMINATION');
  drawParagraph('Both parties agree to a mandatory lock-in period of 3 months. After the lock-in, either party may terminate this agreement by providing 1 (one) full calendar month written notice or rent in lieu thereof. Failure to provide notice permits the Lessor to adjust one month rent from the security deposit.');

  drawHeading('CLAUSE 8: JURISDICTION & ARBITRATION');
  drawParagraph('This agreement shall be governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the civil courts at Bengaluru.');

  y -= 25;
  page.drawText('LESSOR SIGNATURE: ____________________          LESSEE SIGNATURE: ____________________', {
    x: 40,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('Page 1 of 1  |  Fictional Reference Document  |  Model Residential Tenancy Agreement', {
    x: 40,
    y: 25,
    size: 8,
    font: fontOblique,
    color: rgb(0.5, 0.5, 0.5),
  });

  return Buffer.from(await doc.save());
}

async function generateSaasTermsOfService(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Header band
  page.drawRectangle({
    x: 40,
    y: height - 55,
    width: width - 80,
    height: 4,
    color: rgb(0.91, 0.66, 0.24), // Highlighter accent
  });

  page.drawText('CLOUDFORGE ANALYTICS PLATFORM', {
    x: 40,
    y: height - 45,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  page.drawText('Master Software-as-a-Service (SaaS) Terms of Service & Data Processing Terms', {
    x: 40,
    y: height - 68,
    size: 9.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.32),
  });

  page.drawText('Effective Date: January 1, 2026  |  Document Version: 3.4-ENTERPRISE', {
    x: 40,
    y: height - 83,
    size: 8.5,
    font: fontOblique,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawLine({
    start: { x: 40, y: height - 92 },
    end: { x: width - 40, y: height - 92 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.82),
  });

  let y = height - 115;

  const drawHeading = (text: string) => {
    y -= 8;
    page.drawText(text, { x: 40, y, size: 10, font: fontBold, color: rgb(0.1, 0.12, 0.16) });
    y -= 14;
  };

  const drawParagraph = (text: string, indent = 40) => {
    const maxWidth = width - indent - 40;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      if (fontRegular.widthOfTextAtSize(testLine, 8.5) > maxWidth) {
        page.drawText(line, { x: indent, y, size: 8.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        y -= 12;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: indent, y, size: 8.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
  };

  drawHeading('1. SUBSCRIPTION & AUTHORIZED USE');
  drawParagraph('Subject to timely payment of subscription fees, CloudForge grants Customer a non-exclusive, non-transferable, revocable license to access the CloudForge API and developer dashboard. Customer is responsible for all activity conducted through Customer API keys.');

  drawHeading('2. ACCEPTABLE USE & PLATFORM RESTRICTIONS');
  drawParagraph('Customer shall not: (a) reverse engineer, decompile, or extract source code from the services; (b) conduct automated penetration tests or vulnerability scans without prior written authorization; (c) exceed published API rate limits (100 requests per second for Standard Tier); or (d) store or transmit malware or unlawful data.');

  drawHeading('3. BILLING, SUBSCRIPTION TIERS & PAYMENT OBLIGATIONS');
  drawParagraph('Services are billed in advance on monthly or annual billing cycles. Payment is due immediately upon invoice generation. Failed charges will be retried 3 times across a 7-day grace period. Accounts with delinquent balances beyond 14 days will be automatically suspended.');

  drawHeading('4. CUSTOMER DATA OWNERSHIP & PRIVACY');
  drawParagraph('As between the parties, Customer retains all intellectual property rights and title to Customer Data uploaded to the platform. CloudForge shall process Customer Data exclusively to provide the services in accordance with standard Data Protection Regulations. Customer Data is purged 30 calendar days following account termination.');

  drawHeading('5. SERVICE LEVEL AGREEMENT (SLA) & UPTIME GUARANTEE');
  drawParagraph('CloudForge commits to an Monthly Uptime Percentage of 99.9% excluding scheduled maintenance windows notified 48 hours in advance.');
  drawParagraph('SLA Credit Slabs: If monthly uptime falls between 99.0% and 99.89%, Customer is entitled to a 10% billing credit. If uptime drops below 99.0%, Customer is entitled to a 25% credit. Credit claims must be filed within 30 days of the affected calendar month.');

  drawHeading('6. LIMITATION OF LIABILITY & WARRANTY DISCLAIMER');
  drawParagraph('TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CLOUDFORGE BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS OR BUSINESS INTERRUPTION. CLOUDFORGE AGGREGATE LIABILITY SHALL NOT EXCEED TOTAL FEES PAID BY CUSTOMER IN THE 12 MONTHS PRECEDING THE CLAIM.');

  drawHeading('7. TERM, TERMINATION & SUSPENSION');
  drawParagraph('This Agreement commences upon sign-up and continues until cancelled. Customer may cancel at any time via account settings, effective at the end of the current billing period. CloudForge reserves the right to terminate access immediately in the event of severe Acceptable Use Policy violations.');

  page.drawText('Page 1 of 1  |  Fictional Reference Document  |  CloudForge Platform Terms of Service v3.4', {
    x: 40,
    y: 25,
    size: 8,
    font: fontOblique,
    color: rgb(0.5, 0.5, 0.5),
  });

  return Buffer.from(await doc.save());
}

async function main() {
  const attachedDir = path.resolve(__dirname, '../../../attached_assets');
  const clientPublicDir = path.resolve(__dirname, '../../../client/public/samples');

  if (!fs.existsSync(attachedDir)) fs.mkdirSync(attachedDir, { recursive: true });
  if (!fs.existsSync(clientPublicDir)) fs.mkdirSync(clientPublicDir, { recursive: true });

  console.log('Generating sample PDFs...');

  const solarPdf = await generateGovtSolarCircular();
  fs.writeFileSync(path.join(attachedDir, 'govt-solar-circular.pdf'), solarPdf);
  fs.writeFileSync(path.join(clientPublicDir, 'govt-solar-circular.pdf'), solarPdf);
  console.log('Created govt-solar-circular.pdf');

  const leasePdf = await generateResidentialLeaseAgreement();
  fs.writeFileSync(path.join(attachedDir, 'residential-lease-agreement.pdf'), leasePdf);
  fs.writeFileSync(path.join(clientPublicDir, 'residential-lease-agreement.pdf'), leasePdf);
  console.log('Created residential-lease-agreement.pdf');

  const tosPdf = await generateSaasTermsOfService();
  fs.writeFileSync(path.join(attachedDir, 'saas-terms-of-service.pdf'), tosPdf);
  fs.writeFileSync(path.join(clientPublicDir, 'saas-terms-of-service.pdf'), tosPdf);
  console.log('Created saas-terms-of-service.pdf');

  console.log('All 3 fictional sample PDFs successfully generated and saved!');
}

main().catch(err => {
  console.error('Error generating samples:', err);
  process.exit(1);
});
