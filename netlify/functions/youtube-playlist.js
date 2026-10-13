export default async (req) => {
  try {
    const url = new URL(req.url)
    let listId = url.searchParams.get('listId')
    const videoId = url.searchParams.get('videoId')

    if (!listId && videoId) {
      try {
        const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`)
        if (watchRes.ok) {
          const html = await watchRes.text()
          const m = html.match(/"playlistId":"(PL[a-zA-Z0-9_-]+)"/)
          if (m) listId = m[1]
        }
      } catch { /* proceed */ }
    }

    if (!listId) {
      return new Response(JSON.stringify({ error: 'Missing listId or discoverable videoId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ytRes = await fetch(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`
    )
    if (!ytRes.ok) {
      return new Response(JSON.stringify({ error: `YouTube responded with ${ytRes.status}` }), {
        status: ytRes.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const xml = await ytRes.text()
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-Discovered-Playlist-Id',
        'X-Discovered-Playlist-Id': listId,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
