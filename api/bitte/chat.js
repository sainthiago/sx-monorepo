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

  // Forward the request to Bitte API
  return fetch(`${BITTE_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Authorization: `Bearer ${BITTE_API_KEY}`
    },
    body: req.body
  });
}
