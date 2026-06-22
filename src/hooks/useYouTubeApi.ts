"use client";

import { useEffect, useState } from "react";

let ytApiReady = false;
const ytApiWaiters: Array<() => void> = [];
let ytApiLoadFailed = false;
let scriptInjected = false;

function notifyReady(): void {
  ytApiReady = true;
  while (ytApiWaiters.length) ytApiWaiters.shift()?.();
}

function injectScript(onFail: () => void): void {
  if (scriptInjected) return;
  scriptInjected = true;

  window.onYouTubeIframeAPIReady = notifyReady;

  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  s.onerror = () => {
    ytApiLoadFailed = true;
    onFail();
  };
  document.head.appendChild(s);
}

export function whenYTReady(cb: () => void): void {
  if (ytApiReady && window.YT?.Player) cb();
  else ytApiWaiters.push(cb);
}

export function useYouTubeApi(): { ready: boolean; failed: boolean } {
  const [ready, setReady] = useState(ytApiReady);
  const [failed, setFailed] = useState(ytApiLoadFailed);

  useEffect(() => {
    if (ytApiReady) {
      setReady(true);
      return;
    }
    if (ytApiLoadFailed) {
      setFailed(true);
      return;
    }

    injectScript(() => setFailed(true));
    whenYTReady(() => setReady(true));
  }, []);

  return { ready, failed };
}
