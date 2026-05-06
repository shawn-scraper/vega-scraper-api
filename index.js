// index.js - Vega Inspired Scraper Logic
const express = require('express');
const axios = require('axios');
const app = express();

app.get('/extract', async (req, res) => {
    const { id, type = 'movie' } = req.query;
    if (!id) return res.status(400).json({ error: "TMDB ID required" });

    try {
        // 1. Target URL jekhane Vega logic hit kore
        const targetUrl = `https://vidsrc.to/embed/${type}/${id}`;
        
        // 2. Page fetch kora (Vega extraction style)
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // 3. Regex diye 'source' ba 'file' khuje ber kora
        // Note: Real extraction-e eikhane base64 decode logic thake
        const html = response.data;
        const sourceMatch = html.match(/file:"([^"]+)"/); 

        if (sourceMatch) {
            // Vega style decoding logic eikhane hobe
            let streamUrl = sourceMatch[1]; 
            res.json({
                success: true,
                stream_url: streamUrl, // Direct .m3u8 link
                type: "hls"
            });
        } else {
            // Backup logic jodi direct na pay
            res.json({
                success: true,
                stream_url: `https://vidsrc.to/embed/${type}/${id}`, 
                note: "Redirecting to clean embed"
            });
        }
    } catch (err) {
        res.status(500).json({ error: "Scraping failed" });
    }
});

module.exports = app;
