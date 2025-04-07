export default function calcVolumeChangePercent(
  oldVolume: number,
  newVolume: number
): string {
  if (oldVolume === 0) return "N/A"; // 避免除以 0

  const diff = newVolume - oldVolume;
  const percent = (diff / oldVolume) * 100;
  return `${percent.toFixed(2)}%`;
}
