import { useLayoutEffect, useRef, useState } from "react";

export default function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateHeight = (nextHeight: number) => {
      const roundedHeight = Math.max(0, Math.round(nextHeight));
      setHeight((currentHeight) =>
        currentHeight === roundedHeight ? currentHeight : roundedHeight,
      );
    };

    updateHeight(element.getBoundingClientRect().height);

    const observer = new ResizeObserver(([entry]) => {
      updateHeight(entry?.contentRect.height ?? 0);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, height };
}
