const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

function fftMagnitudes(input) {
  const n = input.length, re = input.slice(), im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len, wr0 = Math.cos(angle), wi0 = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const u = i + j, v = u + len / 2, vr = re[v] * wr - im[v] * wi, vi = re[v] * wi + im[v] * wr;
        re[v] = re[u] - vr; im[v] = im[u] - vi; re[u] += vr; im[u] += vi;
        const next = wr * wr0 - wi * wi0; wi = wr * wi0 + wi * wr0; wr = next;
      }
    }
  }
  return Array.from({ length: n / 2 }, (_, i) => Math.hypot(re[i], im[i]));
}

export function wavSamples(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Please upload a valid WAV recording.');
  let offset = 12, fmt = null, data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4), size = buffer.readUInt32LE(offset + 4), start = offset + 8;
    if (id === 'fmt ') fmt = { format: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2), rate: buffer.readUInt32LE(start + 4), bits: buffer.readUInt16LE(start + 14) };
    if (id === 'data') { data = buffer.subarray(start, Math.min(start + size, buffer.length)); break; }
    offset = start + size + (size % 2);
  }
  const bytesPerSample = fmt?.bits / 8;
  const supportedPcm = fmt?.format === 1 && [8, 16, 24, 32].includes(fmt.bits);
  const supportedFloat = fmt?.format === 3 && [32, 64].includes(fmt.bits);
  if (!fmt || !data || (!supportedPcm && !supportedFloat)) throw new Error('Use a PCM or float WAV file for voice analysis.');
  const frameBytes = fmt.channels * bytesPerSample, count = Math.floor(data.length / frameBytes), samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let ch = 0; ch < fmt.channels; ch++) {
      const offset = i * frameBytes + ch * bytesPerSample;
      let value;
      if (fmt.format === 3) value = fmt.bits === 32 ? data.readFloatLE(offset) : data.readDoubleLE(offset);
      else if (fmt.bits === 8) value = (data.readUInt8(offset) - 128) / 128;
      else if (fmt.bits === 16) value = data.readInt16LE(offset) / 32768;
      else if (fmt.bits === 24) { let n = data.readUIntLE(offset, 3); if (n & 0x800000) n -= 0x1000000; value = n / 8388608; }
      else value = data.readInt32LE(offset) / 2147483648;
      sum += Number.isFinite(value) ? value : 0;
    }
    samples[i] = sum / fmt.channels;
  }
  return { samples, sampleRate: fmt.rate };
}

export function extractFeatures(buffer) {
  const { samples, sampleRate } = wavSamples(buffer);
  if (samples.length < sampleRate * 0.25) throw new Error('Please use a recording at least a quarter second long.');
  const targetRate = 8000, stride = Math.max(1, Math.round(sampleRate / targetRate)), reduced = [];
  for (let i = 0; i < samples.length; i += stride) reduced.push(samples[i]);
  const frame = 256, totalFrames = Math.floor(reduced.length / frame), selected = Math.min(12, totalFrames);
  if (!selected) throw new Error('The recording is too short to analyze.');
  const rmsValues = [], crossings = [], centroids = [], pitchValues = [];
  for (let k = 0; k < selected; k++) {
    const start = Math.floor(k * Math.max(0, totalFrames - 1) / Math.max(1, selected - 1)) * frame;
    const chunk = new Float64Array(frame); let power = 0, crossing = 0;
    for (let j = 0; j < frame; j++) { const value = reduced[start + j]; chunk[j] = value * (0.5 - 0.5 * Math.cos(2 * Math.PI * j / (frame - 1))); power += value * value; if (j && (reduced[start + j] >= 0) !== (reduced[start + j - 1] >= 0)) crossing++; }
    rmsValues.push(Math.sqrt(power / frame)); crossings.push(crossing / (frame - 1));
    const mags = fftMagnitudes(chunk); let sum = 0, weighted = 0;
    for (let bin = 1; bin < mags.length; bin++) { sum += mags[bin]; weighted += mags[bin] * bin; }
    centroids.push(sum ? weighted / sum / (frame / 2) : 0);
    let bestLag = 0, best = -Infinity;
    for (let lag = 20; lag <= 120; lag++) { let corr = 0; for (let j = 0; j < frame - lag; j++) corr += chunk[j] * chunk[j + lag]; if (corr > best) { best = corr; bestLag = lag; } }
    pitchValues.push(bestLag ? clamp(targetRate / bestLag, 60, 400) / 400 : 0);
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const rms = mean(rmsValues), rmsStd = Math.sqrt(mean(rmsValues.map(v => (v - rms) ** 2)));
  return [rms, rmsStd, mean(crossings), mean(centroids), mean(pitchValues)];
}
