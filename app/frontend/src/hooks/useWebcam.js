import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Webcam + microphone + face detection using face-api.js.
 * Permission is requested before AI model loading so preview works even if a CDN is slow.
 */
export function useWebcam({ enabled, onEvent }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const lastEventRef = useRef({ no_face: 0, multi_face: 0, camera_dark: 0, camera_blurry: 0 });
  const [status, setStatus] = useState("idle");
  const [faces, setFaces] = useState(1);
  const [micStatus, setMicStatus] = useState("idle");
  const [error, setError] = useState(null);

  const attachVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const setup = async () => {
      setStatus("requesting");
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setMicStatus(stream.getAudioTracks().length > 0 ? "active" : "missing");
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => setStatus("stopped");
          track.onmute = () => setStatus("muted");
          track.onunmute = () => setStatus("ready");
        });
        stream.getAudioTracks().forEach((track) => {
          track.onended = () => setMicStatus("stopped");
          track.onmute = () => setMicStatus("muted");
          track.onunmute = () => setMicStatus("active");
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");

        try {
          setStatus("loading-ai");
          if (!window.faceapi) {
            await new Promise((res, rej) => {
              const s = document.createElement("script");
              s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
              s.onload = res;
              s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          await window.faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights");

          if (!window.cv) {
            await new Promise((res) => {
              const s = document.createElement("script");
              s.src = "https://docs.opencv.org/4.x/opencv.js";
              s.async = true;
              s.onload = res;
              s.onerror = res;
              document.head.appendChild(s);
            });
          }
        } catch (aiError) {
          console.warn("Face detection setup error", aiError);
          setError("Camera active, face detection model unavailable");
          setStatus("ready");
          return;
        }

        if (cancelled) return;
        setStatus("ready");

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !window.faceapi) return;
          try {
            const detections = await window.faceapi.detectAllFaces(
              videoRef.current,
              new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            );
            const count = detections.length;
            setFaces(count);

            const now = Date.now();
            if (count === 0 && now - lastEventRef.current.no_face > 8000) {
              lastEventRef.current.no_face = now;
              onEventRef.current?.("no_face", "high", "No face detected");
            }
            if (count > 1 && now - lastEventRef.current.multi_face > 6000) {
              lastEventRef.current.multi_face = now;
              onEventRef.current?.("multi_face", "high", `${count} faces detected`);
            }

            if (window.cv?.Mat && videoRef.current.videoWidth > 0) {
              const src = window.cv.imread(videoRef.current);
              const gray = new window.cv.Mat();
              const lap = new window.cv.Mat();
              const mean = new window.cv.Mat();
              const stddev = new window.cv.Mat();
              window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
              window.cv.Laplacian(gray, lap, window.cv.CV_64F);
              window.cv.meanStdDev(lap, mean, stddev);
              const brightness = window.cv.mean(gray)[0];
              const blurScore = stddev.doubleAt(0, 0) * stddev.doubleAt(0, 0);
              if (brightness < 35 && now - lastEventRef.current.camera_dark > 10000) {
                lastEventRef.current.camera_dark = now;
                onEventRef.current?.("camera_dark", "medium", "Camera frame is too dark");
              }
              if (blurScore < 20 && now - lastEventRef.current.camera_blurry > 12000) {
                lastEventRef.current.camera_blurry = now;
                onEventRef.current?.("camera_blurry", "low", "Camera frame appears blurry");
              }
              src.delete(); gray.delete(); lap.delete(); mean.delete(); stddev.delete();
            }
          } catch (e) {
            // Ignore individual bad frames.
          }
        }, 1500);
      } catch (e) {
        console.error("Webcam setup error", e);
        setError(e?.message || "Camera or microphone access denied");
        setMicStatus("error");
        setStatus("error");
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  return { videoRef: attachVideoRef, canvasRef, status, faces, micStatus, error };
}
