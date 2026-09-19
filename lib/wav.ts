/**
 * Convert a recorded audio Blob (webm/opus from MediaRecorder) into a
 * 16 kHz mono 16-bit PCM WAV — the format Sarvam saarika STT accepts.
 * Runs entirely in the browser via WebAudio.
 */
export async function blobToWav(blob: Blob, targetRate = 16000): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const Ctx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(buf);

    // downmix to mono
    const chs = decoded.numberOfChannels;
    const frames = decoded.length;
    const mono = new Float32Array(frames);
    for (let c = 0; c < chs; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < frames; i++) mono[i] += data[i] / chs;
    }

    // linear resample to targetRate
    const ratio = decoded.sampleRate / targetRate;
    const outFrames = Math.max(1, Math.floor(frames / ratio));
    const resampled = new Float32Array(outFrames);
    for (let i = 0; i < outFrames; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const i1 = Math.min(frames - 1, i0 + 1);
      const frac = src - i0;
      resampled[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
    }

    // encode 16-bit PCM WAV
    const bytes = new ArrayBuffer(44 + outFrames * 2);
    const view = new DataView(bytes);
    const wstr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    wstr(0, "RIFF");
    view.setUint32(4, 36 + outFrames * 2, true);
    wstr(8, "WAVE");
    wstr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    wstr(36, "data");
    view.setUint32(40, outFrames * 2, true);
    let off = 44;
    for (let i = 0; i < outFrames; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([bytes], { type: "audio/wav" });
  } finally {
    void ctx.close();
  }
}
