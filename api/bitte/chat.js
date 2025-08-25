export default async function handler(req) {
  console.log('🟡 Request received:', {
    method: req.method,
    url: req.url
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    const BITTE_API_KEY = process.env.BITTE_API_KEY;
    const BITTE_API_URL =
      process.env.BITTE_API_URL ||
      'https://ai-runtime-markdown-446257178793.europe-west1.run.app';

    // Get request body
    const body = await req.json();
    console.log('🟡 Request body:', body);

    console.log('🟡 Making request to Bitte API:', {
      url: `${BITTE_API_URL}/chat`,
      hasApiKey: !!BITTE_API_KEY
    });

    const response = await fetch(`${BITTE_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BITTE_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    console.log('🟢 Response status:', response.status);

    // Get response body
    const responseBody = await response.text();
    console.log('🟢 Response body:', responseBody);

    // Return response with same status and body
    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('🔴 Request error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
