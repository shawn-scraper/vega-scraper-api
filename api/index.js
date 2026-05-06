const fs = require('fs');
const path = require('path');
const https = require('https');

const REFERER = 'https://vidlink.pro/';
const ORIGIN = 'https://vidlink.pro';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

let wasmReady = false;

async function bootWasm() {
    if (wasmReady) return;
    globalThis.window = globalThis;
    globalThis.self = globalThis;
    globalThis.document = { createElement: () => ({}), body: { appendChild: () => {} } };

    const sodium = require('libsodium-wrappers');
    await sodium.ready;
    globalThis.sodium = sodium;

    // File path fix for Vercel
    const scriptPath = path.join(process.cwd(), 'api', 'script.js');
    const wasmPath = path.join(process.cwd(), 'api', 'fu.wasm');

    eval(fs.readFileSync(scriptPath, 'utf8'));

    const go = new Dm();
    const wasmBuf = fs.readFileSync(wasmPath);
    const { instance } = await WebAssembly.instantiate(wasmBuf, go.importObject);
    go.run(instance);

    await new Promise(r => setTimeout(r, 600));
    wasmReady = true;
}

function getVidlinkData(url) {
    return new Promise((resolve, reject) => {
        const options = { headers: { 'Referer': REFERER, 'Origin': ORIGIN, 'User-Agent': UA } };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { id, s, e } = req.query;

    if (!id) return res.status(400).json({ error: "Missing ID" });

    try {
        await bootWasm();
        const token = globalThis.getAdv(String(id));
        
        const apiUrl = s 
            ? `https://vidlink.pro/api/b/tv/${token}/${s}/${e || 1}?multiLang=0`
            : `https://vidlink.pro/api/b/movie/${token}?multiLang=0`;

        const data = await getVidlinkData(apiUrl);
        res.json({ url: data?.stream?.playlist || null });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};
