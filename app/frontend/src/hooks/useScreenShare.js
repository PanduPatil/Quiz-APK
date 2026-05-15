import { useCallback, useEffect, useRef, useState } from "react";

export function useScreenShare({ enabled, onEvent }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const stopLoggedRef = useRef(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting");
    stopLoggedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          cursor: "always",
        },
        audio: false,
      });
      streamRef.current = stream;
      const [track] = stream.getVideoTracks();
      track.onended = () => {
        setStatus("stopped");
        if (!stopLoggedRef.current) {
          stopLoggedRef.current = true;
          onEventRef.current?.("screen_share_stopped", "high", "Screen sharing was stopped during the exam");
        }
      };
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("active");
      return true;
    } catch (e) {
      const message = e?.message || "Screen sharing was not granted";
      setError(message);
      setStatus("error");
      onEventRef.current?.("screen_share_missing", "high", message);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) stop();
    return stop;
  }, [enabled, stop]);

  return { videoRef, status, error, start, stop };
}
