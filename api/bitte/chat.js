export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bitteApiKey = process.env.BITTE_API_KEY;
  console.log('BITTE_API_KEY exists:', !!bitteApiKey);

  if (!bitteApiKey) {
    return res.status(500).json({ error: 'BITTE_API_KEY not configured' });
  }

  try {
    console.log('Making request to Bitte API with body:', req.body);

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

    console.log('Bitte API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bitte API error response:', errorText);
      throw new Error(
        `Bitte API responded with status: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log('Bitte API success, returning data');
    res.json(data);
  } catch (error) {
    console.error('Error calling Bitte API:', error.message);
    res.status(500).json({
      error: 'Failed to call Bitte API',
      details: error.message
    });
  }
}
