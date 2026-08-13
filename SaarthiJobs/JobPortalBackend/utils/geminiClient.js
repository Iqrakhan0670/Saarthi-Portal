// utils/geminiClient.js
// Direct HTTP client for Google Gemini API - avoids adding heavy SDK dependencies

import https from 'https';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'generativelanguage.googleapis.com';

/**
 * Call Gemini API to generate a structured JSON response from a prompt.
 * @param {string} systemInstruction - The system-level instruction for Gemini.
 * @param {string} userPrompt - The user-facing prompt (resume text + schema).
 * @returns {Promise<object>} - Parsed JSON object from Gemini response.
 */
export async function callGemini(systemInstruction, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in .env file.');
  }

  const requestBody = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Low temperature for deterministic, accurate extraction
      maxOutputTokens: 8192
    }
  });

  const path = `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: GEMINI_API_BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode !== 200) {
            const errorMsg = parsed?.error?.message || `Gemini API error: HTTP ${res.statusCode}`;
            return reject(new Error(errorMsg));
          }

          // Extract the text content from Gemini's response
          const textContent = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textContent) {
            return reject(new Error('Gemini returned an empty response.'));
          }

          // Parse the JSON from the text content
          try {
            const jsonResult = JSON.parse(textContent);
            resolve(jsonResult);
          } catch (parseErr) {
            reject(new Error(`Failed to parse Gemini JSON output: ${parseErr.message}. Raw: ${textContent.substring(0, 200)}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse Gemini API HTTP response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Gemini API network error: ${err.message}`)));
    req.write(requestBody);
    req.end();
  });
}
