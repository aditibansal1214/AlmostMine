import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AlmostMine Backend',
    timestamp: new Date().toISOString(),
  });
});

// AI Checklist Suggestions (for category & item description)
app.post('/api/ai/checklist', async (req, res) => {
  try {
    const { title, category, description } = req.body || {};
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Deterministic fallback if API key is not yet set
      return res.json({
        items: [
          'Verify condition matches listed photos',
          'Test core functions and inspect power/moving parts',
          'Confirm all accessories, cables and cases are present',
        ],
        source: 'fallback',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert equipment inspector for a community sharing marketplace.
Given this item:
Title: ${title}
Category: ${category}
Description: ${description || 'N/A'}

Suggest 3 to 4 concise, practical inspection checklist items for owner and borrower to verify before handover and upon return.
Focus on safety, essential accessories, and cosmetic/functional condition.
Respond with ONLY a JSON array of strings, e.g. ["item 1", "item 2", "item 3"]. Do not include markdown codeblocks or extra text.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim() || '[]';
    let items: string[] = [];
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      items = JSON.parse(cleanJson);
    } catch {
      items = text.split('\n').map((l) => l.replace(/^[-*0-9.]+\s*/, '').trim()).filter(Boolean);
    }

    res.json({ items: items.slice(0, 5), source: 'gemini' });
  } catch (error: any) {
    console.error('Checklist API error:', error);
    res.status(500).json({
      error: 'Failed to generate checklist suggestion.',
      message: error?.message || 'Server error',
    });
  }
});

// AI Analytics Explain (only receives calculated aggregated JSON metrics, never raw private user data)
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { metricName, metricData, question } = req.body || {};
    if (!metricName || !metricData) {
      return res.status(400).json({ error: 'metricName and metricData are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        narrative: `Aggregated data for ${metricName} shows recorded performance across available observations.`,
        source: 'fallback',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a calm, objective marketplace analyst for AlmostMine.
Explain the following aggregated metric result in 1-2 concise, clear sentences.
Never invent numbers. Cite the provided data.
Question: ${question || 'What does this data show?'}
Metric: ${metricName}
Calculated Data: ${JSON.stringify(metricData)}

Keep the tone calm, direct, and free of hype.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.json({ narrative: response.text?.trim() || '', source: 'gemini' });
  } catch (error: any) {
    console.error('Explain API error:', error);
    res.status(500).json({
      error: 'Failed to generate explanation.',
      message: error?.message || 'Server error',
    });
  }
});

// Setup Vite in middleware mode for development or serve dist in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlmostMine server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
