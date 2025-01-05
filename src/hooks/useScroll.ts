import { useCallback, useEffect, useState } from "react";

export default function useScroll(num: number) {
  const [currentChart, setCurrentChart] = useState<number>(0);

  const debounce = (fn: Function, ms = 100) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  };

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    const totalHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = (scrollPosition / totalHeight) * 100;

    const segment = 100 / num+1;
    for (let i = 1; i <= num+1; i++) {
      if (scrollPercentage < segment * i) {
        setCurrentChart(i - 1);
        break;
      }
    }
  }, [num]);

  useEffect(() => {
    const debouncedHandleScroll = debounce(handleScroll, 50);
    window.addEventListener("scroll", debouncedHandleScroll);
    return () => window.removeEventListener("scroll", debouncedHandleScroll);
  }, [handleScroll]);

  return currentChart;
}
