export interface Size {
  width: number;
  height: number;
}

/**
 * Scales a frame down so its longest side is at most `maxSide`, preserving
 * aspect ratio. Vision encoders resize internally anyway; sending a smaller
 * frame saves upload time to the GPU and memory on low-end phones.
 */
export function fitWithin({ width, height }: Size, maxSide: number): Size {
  if (width <= 0 || height <= 0) throw new Error('The camera has not produced a frame yet.');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Copies the current video frame into a canvas the model can read. */
export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxSide = 768,
): HTMLCanvasElement {
  const size = fitWithin({ width: video.videoWidth, height: video.videoHeight }, maxSide);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read from the camera.');
  context.drawImage(video, 0, 0, size.width, size.height);
  return canvas;
}
