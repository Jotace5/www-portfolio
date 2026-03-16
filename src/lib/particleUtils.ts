// Configuration constants
export const GAP = 1;
export const MOUSE_RADIUS = 80;
export const MOUSE_FORCE = 8;
export const EASE_FACTOR = 0.08;
export const DAMPING = 0.92;
export const RESTLESSNESS = 0.08;
export const COLOR_RETURN_SPEED = 0.03;

export interface TextBlock {
  text: string;
  font: string;       // e.g. "72px Doto", "18px Antic"
  offsetY: number;     // vertical position as a ratio of container height (0 = top, 1 = bottom)
  maxWidth?: number;     // ratio of container width (e.g. 0.8 = 80%). Default: 0.9
  lineHeight?: number;   // multiplier over font size (e.g. 1.5). Default: 1.4
}

export interface ParticleTextConfig {
  blocks: TextBlock[];
  color?: string;      // fill color, default "#000000"
  textAlign?: CanvasTextAlign; // default "center"
}

export const extractParticlesFromText = async (
  config: ParticleTextConfig,
  containerWidth: number,
  containerHeight: number
): Promise<{ x: number; y: number }[]> => {
  await document.fonts.ready;

  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  offscreen.width = containerWidth;
  offscreen.height = containerHeight;

  ctx.fillStyle = config.color || "#000000";
  ctx.textAlign = config.textAlign || "center";
  ctx.textBaseline = "middle";

  config.blocks.forEach((block) => {
    ctx.font = block.font;
    const x = ctx.textAlign === "center" ? containerWidth / 2 : (ctx.textAlign === "right" ? containerWidth : 0);
    
    // Parse the numeric font size from the font string
    const fontSizeMatch = block.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 16;
    
    const maxWidth = (block.maxWidth ?? 0.9) * containerWidth;
    const lineHeight = block.lineHeight ?? 1.4;
    
    const words = block.text.split(" ");
    let currentLine = "";
    let currentY = containerHeight * block.offsetY;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(currentLine.trim(), x, currentY);
        currentLine = words[i] + " ";
        currentY += fontSize * lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    ctx.fillText(currentLine.trim(), x, currentY);
  });

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

  return particles;
};
