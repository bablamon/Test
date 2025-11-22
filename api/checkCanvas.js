// api/checkCanvas.js

const axios = require('axios');
const getCanvases = require('./_canvasApi.js'); // uses protobuf logic

module.exports = async (req, res) => {
  try {
    const { apiKey, trackId } = req.query;

    // 1. Validate API key
    if (!apiKey || apiKey !== process.env.MY_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // 2. Validate trackId
    if (!trackId) {
      return res.status(400).json({ error: "Missing trackId" });
    }

    // 3. Build a fake track object (same structure as _canvasApi input)
    const trackUriObj = [{
      track: { uri: `spotify:track:${trackId}` }
    }];

    // 4. Get Spotify access token for Canvas API
    const canvasToken = await getCanvasToken();
    if (!canvasToken) {
      return res.status(500).json({ error: "Failed to fetch canvas token" });
    }

    // 5. Fetch canvases using protobuf API
    const canvasResponse = await getCanvases(trackUriObj, canvasToken);

    let output = {
      hasCanvas: false,
      canvasUrl: null
    };

    // 6. Parse protobuf response
    if (canvasResponse && canvasResponse.canvasesList?.length > 0) {
      const canvasObj = canvasResponse.canvasesList[0];
      if (canvasObj.canvasUrl && canvasObj.canvasUrl.endsWith(".mp4")) {
        output.hasCanvas = true;
        output.canvasUrl = canvasObj.canvasUrl;
      }
    }

    return res.status(200).json(output);

  } catch (err) {
    console.error("checkCanvas.js ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// 🔧 Helper function to fetch Canvas token (same as canvases.js)
function getCanvasToken() {
  const CANVAS_TOKEN_URL =
    "https://open.spotify.com/get_access_token?reason=transport&productType=web_player";

  return axios
    .get(CANVAS_TOKEN_URL)
    .then((res) => res.data.accessToken)
    .catch((err) => {
      console.error("Token error:", err);
      return null;
    });
}
