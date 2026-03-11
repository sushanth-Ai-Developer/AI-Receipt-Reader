import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('API key missing in environment variables');
    return res.status(500).json({ error: 'API key not configured on server. Please set VITE_API_KEY in Vercel environment variables.' });
  }

  try {
    const { parts, systemInstruction, responseSchema } = req.body;
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

    res.status(200).json(JSON.parse(responseData));
  } catch (err: any) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: err.message });
  }
}
