const {
  BITTE_API_KEY,
  BITTE_API_URL = 'https://ai-runtime-markdown-446257178793.europe-west1.run.app'
} = process.env;

export default function handler(req, res) {
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

  console.log('🟡 Request received:', {
    method: req.method,
    headers: req.headers,
    url: req.url
  });

  // Forward the request to Bitte API
  return new Promise(async resolve => {
    try {
      console.log('🟡 Making request to Bitte API:', {
        url: `${BITTE_API_URL}/chat`,
        hasApiKey: !!BITTE_API_KEY,
        body: req.body
      });

      const response = await fetch(`${BITTE_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BITTE_API_KEY}`,
          Accept: 'text/event-stream'
        },
        body: req.body
      });

      console.log('🟢 Bitte API response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('🔴 API Error:', error);
        res.status(response.status).json({ error });
        return;
      }

      // Set streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log('🟢 Streaming chunk:', chunk);
        res.write(chunk);
      }

      console.log('🟢 Stream complete');
      res.end();
      resolve();
    } catch (error) {
      console.error('🔴 Request error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
      resolve();
    }
  });
}
