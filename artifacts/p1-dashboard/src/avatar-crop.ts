/** Source square shared by the preview and exported avatar. Positions are 0–100. */
export function avatarCrop(width: number, height: number, zoom: number, x: number, y: number) {
  const size = Math.min(width, height) / Math.max(1, Math.min(4, zoom));
  return { size, left: (width - size) * Math.max(0, Math.min(100, x)) / 100,
    top: (height - size) * Math.max(0, Math.min(100, y)) / 100 };
}
