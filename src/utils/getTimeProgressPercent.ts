export default function getTimeProgressPercent(): number {
  const start = new Date();
  start.setHours(9, 0, 0, 0); // 09:00:00

  const end = new Date();
  end.setHours(13, 30, 0, 0); // 13:30:00

  const now = new Date();

  if (now < start) return 0; // 早於 09:00，進度為 0%
  if (now > end) return 100; // 超過 13:30，進度為 100%

  const progress =
    ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) *
    100;

  // 確保進度在 0 ~ 100 之間（避免浮點數誤差導致超過 100）
  return Math.round(Math.min(100, Math.max(0, progress)));
}
