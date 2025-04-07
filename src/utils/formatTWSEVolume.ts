export default function formatTWSEVolume(value: number) {
  if (isNaN(value)) {
    return "0";
  }

  // 將股轉換為張 (1張 = 1000股)
  const volumeInZhang = value / 1000000;

  // 處理小數點後兩位，但去除尾部多餘的零
  const formatted = volumeInZhang.toFixed(2).replace(/\.?0+$/, "");

  // 加入千分位分隔符
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
