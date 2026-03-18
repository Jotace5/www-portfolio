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
  alphaThreshold?: number; // minimum alpha to sample a pixel as particle. Default: 128
}

export interface ParticleTextConfig {
  blocks: TextBlock[];
  color?: string;      // fill color, default "#000000"
  textAlign?: CanvasTextAlign; // default "center"
  paddingTop?: number;
  paddingBottom?: number;
}

export const extractParticlesFromText = async (
  config: ParticleTextConfig,
  containerWidth: number
): Promise<{ particles: { x: number; y: number }[]; contentHeight: number }> => {
  await document.fonts.ready;

  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { particles: [], contentHeight: 0 };

  offscreen.width = containerWidth;
  offscreen.height = 2000;

  ctx.fillStyle = config.color || "#000000";
  ctx.textAlign = config.textAlign || "center";
  ctx.textBaseline = "middle";

  const paddingTop = config.paddingTop ?? 20;
  const paddingBottom = config.paddingBottom ?? 60;
  let cursorY = paddingTop;

  // Pass 1: Layout calculation
  interface LayoutBlock {
    block: TextBlock;
    lines: { text: string; x: number; y: number }[];
  }
  
  const layoutBlocks: LayoutBlock[] = [];

  config.blocks.forEach((block) => {
    // Parse the numeric font size from the font string
    const fontSizeMatch = block.font.match(/(\d+)px/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 16;
    
    ctx.font = block.font;

    const x = ctx.textAlign === "center" ? containerWidth / 2 : (ctx.textAlign === "right" ? containerWidth : 0);

    const maxWidth = (block.maxWidth ?? 0.9) * containerWidth;
    const lineHeight = block.lineHeight ?? 1.4;

    cursorY += block.marginTop;

    const words = block.text.split(" ");
    let currentLine = "";
    const lines: { text: string; x: number; y: number }[] = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        lines.push({ text: currentLine.trim(), x, y: cursorY });
        currentLine = words[i] + " ";
        cursorY += fontSize * lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    lines.push({ text: currentLine.trim(), x, y: cursorY });
    layoutBlocks.push({ block, lines });
  });

  const contentHeight = cursorY + paddingBottom;
  const particles: { x: number; y: number }[] = [];

  // Pass 2: Render and sample per block
  layoutBlocks.forEach(({ block, lines }) => {
    ctx.clearRect(0, 0, containerWidth, offscreen.height);
    
    ctx.font = block.font;
    lines.forEach((line) => {
      ctx.fillText(line.text, line.x, line.y);
    });
    
    const imageData = ctx.getImageData(0, 0, containerWidth, contentHeight);
    const pixels = imageData.data;
    const threshold = block.alphaThreshold ?? 128;
    
    for (let y = 0; y < contentHeight; y += GAP) {
      for (let x = 0; x < containerWidth; x += GAP) {
        const index = (y * containerWidth + x) * 4;
        if (pixels[index + 3] >= threshold) {
          particles.push({
            x: x - containerWidth / 2,
            y: -(y - contentHeight / 2),
          });
        }
      }
    }
  });

  return { particles, contentHeight };
};
