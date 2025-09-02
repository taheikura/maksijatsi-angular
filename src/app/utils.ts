export class DiceCollection extends Array {
  sum(key: number | string): number {
    return this.reduce((a, b) => a + (b[key] ?? 0), 0);
  }
}

export function generateNoise(opacity: number, canvas: HTMLCanvasElement, intensity = 60): void {
  let x, y, number;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  for (x = 0; x < canvas.width; x++) {
    for (y = 0; y < canvas.height; y++) {
      number = Math.floor(Math.random() * intensity);

      ctx.fillStyle = `rgba(${number},${number},${number},${opacity || 0.2})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
