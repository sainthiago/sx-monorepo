import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    return res.status(200).end();
  }

  try {
    const BITTE_API_KEY = process.env.BITTE_API_KEY;
    const BITTE_API_URL =
      'https://ai-runtime-markdown-446257178793.europe-west1.run.app';

    const response = await fetch(`${BITTE_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BITTE_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    // Forward the response
    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
