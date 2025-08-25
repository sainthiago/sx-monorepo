export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bitteApiKey = process.env.BITTE_API_KEY;
  if (!bitteApiKey) {
    return res.status(500).json({ error: 'BITTE_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      'https://ai-runtime-446257178793.europe-west1.run.app/chat',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bitteApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      }
    );

    if (!response.ok) {
      throw new Error(`Bitte API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling Bitte API:', error);
    res.status(500).json({ error: 'Failed to call Bitte API' });
  }
}
