import { fetch } from "@tauri-apps/plugin-http";

export const tauriFetcher = async (url: string) => {
  const response = await fetch(url, { method: "GET" });

  // 檢查 HTTP 狀態碼
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};
