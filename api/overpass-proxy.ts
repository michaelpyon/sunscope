// Vercel Edge Function: proxies and caches Overpass API requests
// Deploy: Vercel auto-detects api/ directory as serverless functions

export const config = {
  runtime: 'edge',
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CACHE_TTL = 60 * 60 * 24 // 24 hours

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await request.text()

    // Forward to Overpass API
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Overpass API returned ' + response.status }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.text()

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to reach Overpass API' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
