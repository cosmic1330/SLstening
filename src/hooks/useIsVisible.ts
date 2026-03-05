import { RefObject, useEffect, useState } from "react";

let observer: IntersectionObserver | null = null;
const callbacks = new Map<Element, (isIntersecting: boolean) => void>();

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const callback = callbacks.get(entry.target);
          if (callback) {
            callback(entry.isIntersecting);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0 },
    );
  }
  return observer;
}

export function useIsVisible(ref: RefObject<HTMLElement>) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = getObserver();
    callbacks.set(el, setIntersecting);
    obs.observe(el);

    return () => {
      callbacks.delete(el);
      obs.unobserve(el);
      if (callbacks.size === 0) {
        obs.disconnect();
        observer = null;
      }
    };
  }, [ref]);

  return isIntersecting;
}
