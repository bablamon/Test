// api/checkcanvas.js
const axios = require('axios');
const getCanvases = require('./_canvasApi.js');

// ---- CONFIG ----
const SECRET_API_KEY = process.env.SECRET_API_KEY || 'gregfkowl';
const SP_DC = process.env.SP_DC;

// ---- HELPERS ----

// Get Spotify web-player access token using sp_dc cookie
async function getCanvasTokenWithSpDc() {
  if (!SP_DC) {
    throw new Error('SP_DC environment variable not set');
  }

  const CANVAS_TOKEN_URL =
    'https://open.spotify.com/get_access_token?reason=transport&productType=web_player';

  const res = await axios.get(CANVAS_TOKEN_URL, {
    headers: {
      // Core bits
      Cookie: `sp_dc=${SP_DC}`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en'
    }
  });

  if (res.status !== 200 || !res.data || !res.data.accessToken) {
    throw new Error('Failed to fetch canvas token');
  }

  return res.data.accessToken;
}

// Extract track ID from a Spotify track URL
function extractTrackIdFromUrl(url) {
  if (!url) return null;
  const clean = url.split('?')[0]; // remove query params
  const match = clean.match(/\/track\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

// Build spotify:track: URI
function buildTrackUri(trackId) {
  return `spotify:track:${trackId}`;
}

// ---- MAIN HANDLER ----
// Vercel serverless style: module.exports = async (req, res) => { ... }
module.exports = async (req, res) => {
  try {
    // --- AUTH ---
    const apiKey =
  req.query.apiKey ||
  req.headers['api-key'] ||
  req.headers['api_key'];
    if (!apiKey || apiKey !== SECRET_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // --- INPUT: track id / url from query or body ---
    const {
      trackId,
      track_id,
      trackUrl,
      track_url
    } = req.query;

    let id =
      trackId ||
      track_id ||
      (req.body && (req.body.trackId || req.body.track_id)) ||
      null;

    let url =
      trackUrl ||
      track_url ||
      (req.body && (req.body.trackUrl || req.body.track_url)) ||
      null;

    if (!id && url) {
      id = extractTrackIdFromUrl(url);
    }

    if (!id) {
      return res
        .status(400)
        .json({ error: 'Provide trackId or trackUrl (Spotify track link)' });
    }

    const trackUri = buildTrackUri(id);

    // --- TOKEN VIA SP_DC ---
    const canvasToken = await getCanvasTokenWithSpDc();

    // --- CALL EXISTING CANVAS API ---
    // _canvasApi.js expects an array of objects with .track.uri
    const tracks = [{ track: { uri: trackUri } }];

    const canvasResponse = await getCanvases(tracks, canvasToken);
    const canvasesList = (canvasResponse && canvasResponse.canvasesList) || [];

    const canvasForTrack = canvasesList.find(
      (c) => c.trackUri === trackUri
    );

    if (!canvasForTrack || !canvasForTrack.canvasUrl) {
      // No canvas
      return res.status(200).json({
        trackId: id,
        trackUri,
        hasCanvas: false,
        canvasUrl: null
      });
    }

    // Found canvas
    return res.status(200).json({
      trackId: id,
      trackUri,
      hasCanvas: true,
      canvasUrl: canvasForTrack.canvasUrl
    });
  } catch (err) {
    console.error('checkcanvas error:', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
};

