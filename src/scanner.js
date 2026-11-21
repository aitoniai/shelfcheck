// Camera barcode scanning using Chrome's built-in BarcodeDetector (Android). No library needed.
export const canScan = () => 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

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
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
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
