import { useCallback, useLayoutEffect, useRef, useState } from "react";

export default function useElementHeight<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null);
  const [element, setElement] = useState<T | null>(null);
  const [height, setHeight] = useState(0);

  const ref = useCallback((node: T | null) => {
    elementRef.current = node;
    setElement((current) => (current === node ? current : node));
  }, []);

  useLayoutEffect(() => {
    if (!element) return;
    let active = true;
    let rafId: number | null = null;

    const updateHeight = (nextHeight: number) => {
      if (!active || elementRef.current !== element) return;
      const roundedHeight = Math.max(0, Math.round(nextHeight));
      setHeight((currentHeight) =>
        currentHeight === roundedHeight ? currentHeight : roundedHeight,
      );
    };

    const measure = () => {
      if (!active || elementRef.current !== element) return;
      updateHeight(element.getBoundingClientRect().height);
    };

    measure();
    if (typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    }

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(([entry]) => {
          updateHeight(entry?.contentRect.height ?? 0);
        })
      : null;
    observer?.observe(element);

    return () => {
      active = false;
      if (rafId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
    };
  }, [element]);

  return { ref, height };
}
