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
          Authorization: `Bearer ${BITTE_API_KEY}`
        },
        body: req.body
      });

      console.log('🟢 Bitte API response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Copy status and headers
      res.status(response.status);
      for (const [key, value] of Object.entries(response.headers)) {
        res.setHeader(key, value);
      }

      // Send the response
      const text = await response.text();
      console.log('🟢 Bitte API response body:', text);

      try {
        const data = JSON.parse(text);
        console.log('🟢 Parsed JSON response:', data);
        res.json(data);
      } catch (parseError) {
        console.error('🔴 Failed to parse JSON:', parseError);
        res.status(500).json({
          error: 'Invalid JSON response',
          raw: `${text.substring(0, 200)}...`
        });
      }
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
