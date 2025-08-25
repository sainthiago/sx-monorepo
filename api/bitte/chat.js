const {
  BITTE_API_KEY,
  BITTE_API_URL = 'https://ai-runtime-446257178793.europe-west1.run.app'
} = process.env;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    return res.status(200).end();
  }

  const response = await fetch(`${BITTE_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Authorization: `Bearer ${BITTE_API_KEY}`
    },
    body: req.body,
    duplex: 'half'
  });

  const data = await response.json();
  res.json(data);
}
