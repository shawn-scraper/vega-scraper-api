const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Embed Player Route
app.get('/embed', async (req, res) => {
    const { id, type = 'movie' } = req.query;

    if (!id) {
        return res.send("Error: TMDB ID is missing!");
    }

    try {
        // 1. Scraping logic (Vega Inspired)
        const targetUrl = `https://vidsrc.to/embed/${type}/${id}`;
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const html = response.data;
        // Regex to find direct stream link
        const sourceMatch = html.match(/file:"([^"]+)"/);
        
        // Agar scraper fail kore, tahole backup iframe source use korbe
        let finalStream = sourceMatch ? sourceMatch[1] : `https://vidsrc.to/embed/${type}/${id}`;

        // 2. Return Full HTML Player for Iframe
        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vega Stream Player</title>
            <script src="https://cdn.jsdelivr.net/npm/artplayer/dist/artplayer.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
                #player { width: 100%; height: 100vh; }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script>
                var art = new ArtPlayer({
                    container: '#player',
                    url: '${finalStream}',
                    type: 'm3u8',
                    fullscreen: true,
                    fullscreenWeb: true,
                    playbackRate: true,
                    setting: true,
                    pip: true,
                    autoSize: true,
                    screenshot: true,
                    hotkey: true,
                    customType: {
                        m3u8: function (video, url) {
                            if (Hls.isSupported()) {
                                const hls = new Hls();
                                hls.loadSource(url);
                                hls.attachMedia(video);
                            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                                video.src = url;
                            }
                        },
                    },
                });

                // Error handling
                art.on('error', function() {
                    console.log("Stream failed, switching to backup...");
                    window.location.href = 'https://vidsrc.to/embed/${type}/${id}';
                });
            </script>
        </body>
        </html>
        `);
    } catch (err) {
        res.status(500).send("Server Error: Could not fetch stream.");
    }
});

// Port settings for Vercel
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
