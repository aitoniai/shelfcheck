// Camera barcode scanning. Uses the browser's built-in BarcodeDetector when it can read EAN codes,
// otherwise loads a WebAssembly version of the same API (works in any browser with a camera).
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
const FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.3/ponyfill/+esm';

export const canScan = () => !!navigator.mediaDevices?.getUserMedia;

async function createDetector() {
  if ('BarcodeDetector' in window) {
    const supported = await BarcodeDetector.getSupportedFormats().catch(() => []);
    if (supported.includes('ean_13')) return new BarcodeDetector({ formats: FORMATS });
  }
  const { BarcodeDetector: Fallback } = await import(FALLBACK_URL);
  return new Fallback({ formats: FORMATS });
}

/** Start scanning into `video`. Resolves with the first barcode found. Call the returned stop() to cancel. */
export function startScan(video) {
  let stream, timer, stopped = false;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
  const result = (async () => {
    const detector = await createDetector(); // before the camera, so a failed load can't leave the camera on
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (stopped) { stop(); return null; }
    video.srcObject = stream;
    await video.play();
    return new Promise((resolve) => {
      const tick = async () => {
        if (stopped) return resolve(null);
        const [code] = await detector.detect(video).catch(() => []);
        if (code) { stop(); return resolve(code.rawValue); }
        timer = setTimeout(tick, 200);
      };
      tick();
    });
  })();
  return { result, stop };
}
