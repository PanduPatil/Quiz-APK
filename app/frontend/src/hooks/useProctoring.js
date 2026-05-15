import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";

/**
 * Proctoring hook: tab-switch, focus loss, copy/paste/right-click block,
 * fullscreen enforce, devtools detect (basic), keyboard shortcut block.
 */
export function useProctoring({ attemptId, enabled, onAutoSubmit, maxViolations = 3 }) {
  const [violations, setViolations] = useState([]);
  const [trustScore, setTrustScore] = useState(100);
  const [lastAlert, setLastAlert] = useState(null);
  const seenRef = useRef(new Set());

  const logViolation = useCallback(async (type, severity = "medium", details = "") => {
    if (!enabled || !attemptId) return;
    try {
      const { data } = await api.post("/attempts/violation", {
        attempt_id: attemptId, type, severity, details,
      });
      setViolations((prev) => [...prev, { type, severity, details, at: Date.now() }]);
      if (typeof data.trust_score === "number") setTrustScore(data.trust_score);
      setLastAlert({ type, at: Date.now() });
      if (data.auto_submitted && onAutoSubmit) onAutoSubmit();
    } catch (e) { /* ignore */ }
  }, [attemptId, enabled, onAutoSubmit]);

  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (document.hidden) logViolation("tab_switch", "high", "Tab hidden");
    };
    const onBlur = () => logViolation("focus_loss", "medium", "Window lost focus");
    const onCopy = (e) => { e.preventDefault(); logViolation("copy_attempt", "medium"); };
    const onPaste = (e) => { e.preventDefault(); logViolation("paste_attempt", "high"); };
    const onContext = (e) => { e.preventDefault(); logViolation("right_click", "low"); };
    const onKey = (e) => {
      // Block DevTools / view-source / print
      const k = e.key?.toLowerCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        (e.ctrlKey && ["u", "p", "s"].includes(k)) ||
        (e.metaKey && e.altKey && k === "i")
      ) {
        e.preventDefault();
        logViolation("devtools", "high", `Blocked shortcut: ${e.key}`);
      }
    };
    const onFullScreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation("fullscreen_exit", "high", "Fullscreen exited");
      }
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullScreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullScreenChange);
    };
  }, [enabled, logViolation]);

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) { /* ignore */ }
  };

  return { violations, trustScore, lastAlert, logViolation, enterFullscreen };
}
