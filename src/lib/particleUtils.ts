// Configuration constants
export const GAP = 3;
export const MOUSE_RADIUS = 80;
export const MOUSE_FORCE = 8;
export const EASE_FACTOR = 0.08;
export const DAMPING = 0.92;
export const RESTLESSNESS = 0.08;
export const COLOR_RETURN_SPEED = 0.03;

export const extractParticlesFromImage = (
  imageSrc: string,
  containerWidth: number,
  containerHeight: number
): Promise<{ x: number; y: number }[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create offscreen canvas sized to the image
      const offscreen = document.createElement("canvas");
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        resolve([]);
        return;
      }

      // Scale image to fit container while maintaining aspect ratio
      const scale =
        Math.min(containerWidth / img.width, containerHeight / img.height) *
        0.8; // 80% of container to leave padding

      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;

      offscreen.width = containerWidth;
      offscreen.height = containerHeight;

      // Draw centered
      const offsetX = (containerWidth - drawWidth) / 2;
      const offsetY = (containerHeight - drawHeight) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Sample pixels
      const imageData = ctx.getImageData(0, 0, containerWidth, containerHeight);
      const pixels = imageData.data;
      const particles: { x: number; y: number }[] = [];

      for (let y = 0; y < containerHeight; y += GAP) {
        for (let x = 0; x < containerWidth; x += GAP) {
          const index = (y * containerWidth + x) * 4;
          const alpha = pixels[index + 3];
          if (alpha > 128) {
            particles.push({
              x: x - containerWidth / 2,
              y: -(y - containerHeight / 2),
            });
          }
        }
      }

      resolve(particles);
    };
    img.onerror = () => resolve([]);
    img.src = imageSrc;
  });
};
