// api/checkCanvas.js

const axios = require('axios');
const getCanvases = require('./_canvasApi.js'); // your protobuf canvas API

module.exports = async (req, res) => {
  try {
    const { apiKey, trackId } = req.query;

    // 1. API key validation
    if (!apiKey || apiKey !== process.env.MY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // 2. Track ID validation
    if (!trackId) {
      return res.status(400).json({ error: "Missing trackId" });
    }

    // 3. Create the fake Recently Played-style object (required by _canvasApi.js)
    const trackUriObj = [
      {
        track: { uri: `spotify:track:${trackId}` }
      }
    ];

    // 4. Get Canvas Token with spoofed headers
    const canvasToken = await getCanvasToken();
    if (!canvasToken) {
      return res.status(500).json({ error: "Failed to fetch canvas token" });
    }

    // 5. Fetch canvas via protobuf API
    const canvasResponse = await getCanvases(trackUriObj, canvasToken);

    let output = {
      hasCanvas: false,
      canvasUrl: null
    };

    // 6. Parse protobuf response
    if (canvasResponse && canvasResponse.canvasesList?.length > 0) {
      const c = canvasResponse.canvasesList[0];

      if (c.canvasUrl && c.canvasUrl.endsWith(".mp4")) {
        output.hasCanvas = true;
        output.canvasUrl = c.canvasUrl;
      }
    }

    return res.status(200).json(output);

  } catch (err) {
    console.error("checkCanvas ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// ========================================================
// 🎯 NEW FIXED FUNCTION: getCanvasToken() with spoofed browser headers
// ========================================================
function getCanvasToken() {
  const url =
    "https://open.spotify.com/get_access_token?reason=transport&productType=web_player";

  return axios
    .get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en",
        "Referer": "https://open.spotify.com/",
      },
    })
    .then((res) => res.data.accessToken)
    .catch((err) => {
      console.error(
        "Token error:",
        err.response?.status,
        err.response?.data || err.message
      );
      return null;
    });
}
