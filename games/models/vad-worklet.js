// Voice activity detection on the audio thread. 20 ms frames, adaptive loudness floor, pre-roll so the
// first syllable isn't cut, ends after a short silence. While the game talks the gate is shut: frames are dropped.
// out: {type:"start"} {type:"clip", pcm, sr, ms, voicedMs, peak} {type:"drop", ...} {type:"open", gatedLoud}
class VAD extends AudioWorkletProcessor {
  constructor(opt){
    super();
    this.o = { endMs: 800, capMs: 5000, preMs: 300, minMs: 300, minPeak: .02, ...(opt.processorOptions || {}) };
    this.fl = Math.round(sampleRate * .02); this.buf = new Float32Array(this.fl); this.bi = 0;
    this.floor = .005; this.gate = true; this.gatedLoud = 0; this.pre = []; this.clip = null; this.hot = 0; this.t = 0;
    this.port.onmessage = e => {
      if (!("gate" in e.data)) return;
      if (e.data.gate) this.clip = null;   // the game started talking: throw away half a clip
      else if (this.gate){ this.port.postMessage({ type: "open", gatedLoud: this.gatedLoud }); this.gatedLoud = 0; this.pre = []; }
      this.gate = e.data.gate; this.hot = 0;
    };
  }
  process(inputs){
    const x = inputs[0] && inputs[0][0];
    if (x) for (let i = 0; i < x.length; i++){ this.buf[this.bi++] = x[i]; if (this.bi === this.fl){ this.frame(this.buf.slice()); this.bi = 0; } }
    return true;
  }
  frame(f){
    this.t += 20;
    let s = 0; for (let i = 0; i < f.length; i++) s += f[i] * f[i];
    const rms = Math.sqrt(s / f.length), on = Math.max(3 * this.floor, .012), off = 2 * this.floor;
    if (this.gate){ if (rms > on) this.gatedLoud++; return; }
    if (!this.clip){
      this.pre.push(f); if (this.pre.length > this.o.preMs / 20) this.pre.shift();
      if (rms > on){
        if (++this.hot >= 3){ this.clip = this.pre; this.pre = []; this.voiced = 3; this.quiet = 0; this.peak = rms; this.port.postMessage({ type: "start", t: this.t }); }
      } else { this.hot = 0; this.floor = Math.max(.003, this.floor * .95 + rms * .05); }   // slow noise floor, quiet frames only
      return;
    }
    this.clip.push(f); this.peak = Math.max(this.peak, rms);
    if (rms > off){ this.voiced++; this.quiet = 0; } else this.quiet += 20;
    const ms = this.clip.length * 20;
    if (this.quiet >= this.o.endMs || ms >= this.o.capMs) this.finish(ms);
  }
  finish(ms){
    const c = this.clip, info = { ms, voicedMs: this.voiced * 20, peak: +this.peak.toFixed(3), t: this.t };
    this.clip = null; this.hot = 0;
    if (info.voicedMs < this.o.minMs || info.peak < this.o.minPeak) return this.port.postMessage({ type: "drop", ...info });
    const pcm = new Float32Array(c.length * this.fl); c.forEach((f, i) => pcm.set(f, i * this.fl));
    this.port.postMessage({ type: "clip", pcm, sr: sampleRate, ...info }, [pcm.buffer]);
  }
}
registerProcessor("vad", VAD);
