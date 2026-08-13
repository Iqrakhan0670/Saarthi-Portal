// controller/aiAutofillController.js
// Resume parsing pipeline: PDF/DOCX text extraction → local rule-based parser
// NO external API calls. NO API keys required.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import mammoth from 'mammoth';
import { parseResume } from '../utils/resumeParser.js';

// ─── Main Parse Controller ────────────────────────────────────────────────────
// POST /api/ai/parse-resume
export const parseResumeWithAI = async (req, res) => {
  console.log(`[Parser] Resume parse request from user ${req.user?.id}`);

  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded.' });
  }

  const { buffer, originalname, mimetype } = req.file;
  const ext = (originalname || '').split('.').pop().toLowerCase();

  // ── Step 1: Extract raw text ──────────────────────────────────────────────
  let resumeText = '';
  try {
    if (ext === 'pdf' || mimetype === 'application/pdf') {
      const PDFParseClass = pdfParse?.PDFParse || (pdfParse?.default && pdfParse.default.PDFParse);
      if (!PDFParseClass) {
        throw new Error('PDFParse class not found in the pdf-parse package.');
      }
      const parser = new PDFParseClass({ data: buffer });
      const data = await parser.getText();
      if (typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch (_) {}
      }
      resumeText = (data && data.text) ? data.text : '';
    } else if (
      ext === 'docx' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'doc'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value || '';
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Please upload a PDF or DOCX file.'
      });
    }
  } catch (extractErr) {
    console.error('[Parser] Text extraction failed:', extractErr.message);
    return res.status(500).json({
      error: 'Failed to extract text from resume. Ensure it is a text-based PDF, not a scanned image.',
      details: extractErr.message
    });
  }

  resumeText = resumeText.trim();
  if (!resumeText || resumeText.length < 50) {
    return res.status(400).json({
      error: 'Resume text is too short or unreadable. Ensure it is a text-based PDF (not a scanned image).'
    });
  }

  console.log(`[Parser] Extracted ${resumeText.length} characters from "${originalname}"`);

  // ── Step 2: Run local rule-based parser ───────────────────────────────────
  let parsedData;
  try {
    parsedData = parseResume(resumeText);
    console.log(`[Parser] Parsing complete — skills: ${parsedData.skills.length}, edu: ${parsedData.education.length}, exp: ${parsedData.experience.length}`);
  } catch (parseErr) {
    console.error('[Parser] Parsing error:', parseErr.message);
    return res.status(422).json({ error: 'Resume parsing failed: ' + parseErr.message });
  }

  return res.status(200).json({
    success: true,
    parsed: parsedData,
    charCount: resumeText.length,
    engine: 'local-rules', // flag so frontend knows no API was used
  });
};
