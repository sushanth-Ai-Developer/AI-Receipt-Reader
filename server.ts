import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Proxy for Gemini
  app.post('/api/process', async (req, res) => {
    const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.error('API key missing in environment variables');
      return res.status(500).json({ error: 'API key not configured on server. Please set VITE_API_KEY in settings.' });
    }

    try {
      const { parts, systemInstruction, responseSchema } = req.body;
      console.log('Processing request for Gemini...');
      const modelName = 'gemini-3-flash-preview';
      
      const body = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          ...(responseSchema && { 
            response_mime_type: 'application/json', 
            response_schema: responseSchema 
          }),
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const responseData = await response.text();
      
      if (!response.ok) {
        console.error(`Gemini API error (${response.status}):`, responseData);
        try {
          const errorJson = JSON.parse(responseData);
          return res.status(response.status).json({ error: errorJson.error?.message || responseData });
        } catch {
          return res.status(response.status).json({ error: responseData });
        }
      }

      console.log('Gemini processing successful');
      res.json(JSON.parse(responseData));
    } catch (err) {
      console.error('Server-side error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
