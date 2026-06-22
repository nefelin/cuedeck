"use client";

import { useEffect, useState } from "react";

/** True on phones/tablets and coarse-pointer devices — use swipe UI. */
export function useSwipeUI(): boolean {
  const [swipeUI, setSwipeUI] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px), (pointer: coarse)");
    const update = () => setSwipeUI(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return swipeUI;
}
