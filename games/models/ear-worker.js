// The game's ears: Whisper running on the phone (WASM, one thread). No Siri, no server, no cost.
// in:  {type:"load", model, path?, bytes?}   {type:"clip", id, pcm:Float32Array, sr}
// out: {type:"progress", pct}  {type:"ready", loadMs, warmMs}  {type:"text", id, text, ms, sec}  {type:"error", msg}
// Pinned CDN copy (byte-identical to the npm 4.3.0 build). Not self-hosted: GitHub's secret scanner
// false-flags a string in the minified library as a Mistral key and blocks the push.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js";

const HERE = new URL("./", import.meta.url).href;
// a path, not a full URL: transformers.js 4.3 skips its "does this file exist" check for http URLs,
// which silently drops the tokenizer and preprocessor files
env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = new URL(HERE).pathname;
env.backends.onnx.wasm.numThreads = 1;   // GitHub Pages can't send COOP/COEP, so no threads
// With a progress bar, transformers.js 4.3 GETs each .onnx twice: first only to read its size, then for real.
// That doubled the first download (99 MB, not 58). Hand the size check a body-less copy of the headers and
// give the one real download to the second call.
const pending = new Map();
env.fetch = (url, opt) => {
  const u = String(url);
  if (!u.endsWith(".onnx")) return fetch(url, opt);
  if (pending.has(u)){ const p = pending.get(u); pending.delete(u); return p; }
  const p = fetch(url, opt); pending.set(u, p);
  return p.then(r => new Response(null, { status: r.status, statusText: r.statusText, headers: r.headers }));
};
env.backends.onnx.wasm.wasmPaths = { mjs: HERE + "ort-wasm-simd-threaded.mjs", wasm: HERE + "ort-wasm-simd-threaded.wasm" };

let asr = null;
const run = pcm => asr(pcm, { max_new_tokens: 24 });   // a name is a few tokens; a cap stops hallucination loops

// mic rate (44.1k / 48k) -> 16k: average each output step (cheap low-pass), good enough for a spoken name
function to16k(x, sr){
  if (sr === 16000) return x;
  const r = sr / 16000, n = Math.floor(x.length / r), y = new Float32Array(n);
  for (let i = 0; i < n; i++){
    const a = Math.floor(i * r), b = Math.min(x.length, Math.floor((i + 1) * r));
    let s = 0; for (let j = a; j < b; j++) s += x[j];
    y[i] = s / Math.max(1, b - a);
  }
  return y;
}

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === "load"){
      if (m.path) env.localModelPath = new URL(m.path, self.location.href).pathname;
      const got = {}, total = m.bytes || 0, t0 = performance.now();
      asr = await pipeline("automatic-speech-recognition", m.model, {
        device: "wasm", dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
        progress_callback: p => {
          if (p.status !== "progress" || !p.total) return;
          got[p.file] = [p.loaded, p.total];
          let a = 0, b = 0; for (const [l, t] of Object.values(got)){ a += l; b += t; }
          postMessage({ type: "progress", pct: Math.min(99, Math.round(100 * a / Math.max(b, total))) });
        },
      });
      const loadMs = performance.now() - t0, t1 = performance.now();
      await run(new Float32Array(16000));   // warm-up: the first run compiles, so time a real one
      postMessage({ type: "ready", loadMs: Math.round(loadMs), warmMs: Math.round(performance.now() - t1) });
    } else if (m.type === "clip"){
      const pcm = to16k(m.pcm, m.sr), t0 = performance.now();
      const out = await run(pcm);
      postMessage({ type: "text", id: m.id, text: (out && out.text) || "", ms: Math.round(performance.now() - t0), sec: +(pcm.length / 16000).toFixed(2) });
    }
  } catch (e){ postMessage({ type: "error", id: m.id, msg: String((e && e.message) || e) }); }
};
