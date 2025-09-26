const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const yyyy = d.toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
  });
  const mm = d.toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
  });
  const dd = d.toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
    day: "2-digit",
  });
  const hh = d.toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    hour12: false,
  });
  let mi = d.toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
    minute: "2-digit",
  });
  // 如果分鐘是整點（即分鐘為 0），強制設為 "00"
  if (parseInt(mi, 10) === 0) {
    mi = "00";
  }
  return parseInt(`${yyyy}${mm}${dd}${hh}${mi}`, 10);
};

export default formatDateTime;
