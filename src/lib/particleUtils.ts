// Configuration constants
export const GAP = 1;
export const VORTEX_TANGENTIAL = 80;   // fuerza de giro (componente dominante)
export const VORTEX_ATTRACTION = 15;    // fuerza de atracción hacia el cursor (sutil)
export const VORTEX_MAX_FORCE = 50;    // cap para evitar fuerzas infinitas a distancia ~0
export const EASE_FACTOR = 0.01;
export const DAMPING = 0.80;
export const RESTLESSNESS = 0.1;
export const COLOR_RETURN_SPEED = 5;

// Visual constants
export const PARTICLE_SIZE = 1;
export const PARTICLE_OPACITY = 1.0;
export const BASE_COLOR = 0x1a1a2e;
export const ACCENT_COLOR = 0x8b5cf6;
export const BACKGROUND_COLOR = 0xffffff;

export interface TextBlock {
  text: string;
  font: string;       // e.g. "72px Doto", "18px Antic"
  marginTop: number;     // pixel gap above this block
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

  let cursorY = 0;

  config.blocks.forEach((block) => {
    ctx.font = block.font;
    const x = ctx.textAlign === "center" ? containerWidth / 2 : (ctx.textAlign === "right" ? containerWidth : 0);

    // Parse the numeric font size from the font string
    const fontSizeMatch = block.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 16;

    const maxWidth = (block.maxWidth ?? 0.9) * containerWidth;
    const lineHeight = block.lineHeight ?? 1.4;

    cursorY += block.marginTop;

    const words = block.text.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(currentLine.trim(), x, cursorY);
        currentLine = words[i] + " ";
        cursorY += fontSize * lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    ctx.fillText(currentLine.trim(), x, cursorY);
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
