import { useEffect, useState } from "react";

export function useDebugMode() {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    return localStorage.getItem("slitenting-debugMode") === "true";
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "slitenting-debugMode") {
        setIsDebugMode(e.newValue === "true");
      }
    };

    // 監聽 localStorage 變化
    window.addEventListener("storage", handleStorageChange);

    // 定期檢查變化（用於同一頁面內的變化）
    const interval = setInterval(() => {
      const currentValue =
        localStorage.getItem("slitenting-debugMode") === "true";
      if (currentValue !== isDebugMode) {
        setIsDebugMode(currentValue);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isDebugMode]);

  return isDebugMode;
}
