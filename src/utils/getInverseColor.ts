export default function getInverseColor(color: string) {
  // 提取 RGB 值
  const [r, g, b] = color.match(/\d+/g)?.map(Number) || [255, 255, 255];
  // 計算反色
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 返回黑色或白色
  return luminance > 128 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
}
