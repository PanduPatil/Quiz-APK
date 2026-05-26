import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useProctoring } from "@/hooks/useProctoring";
import { useWebcam } from "@/hooks/useWebcam";
import { useScreenShare } from "@/hooks/useScreenShare";
import { toast } from "sonner";
import { AlertTriangle, Shield, Camera, Eye, Clock, MonitorUp, Mic, CheckCircle2, UserRound, RotateCcw, Code2 } from "lucide-react";

const DIFF_COLORS = { easy: "bg-emerald-100 text-emerald-800", medium: "bg-amber-100 text-amber-800", hard: "bg-rose-100 text-rose-800" };

export default function TakeQuiz() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const [phase, setPhase] = useState("intro"); // intro | running | done
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [onboardingStep, setOnboardingStep] = useState("instructions");
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [personalSaved, setPersonalSaved] = useState(false);
  const [faceCaptures, setFaceCaptures] = useState({});
  const [markedReview, setMarkedReview] = useState(new Set());
  const [skipped, setSkipped] = useState(new Set());
  const questionStartRef = useRef(Date.now());

  // Fetch quiz
  useEffect(() => {
    api.get(`/quizzes/${quizId}`).then((r) => setQuiz(r.data)).catch(() => toast.error("Quiz not found"));
  }, [quizId]);

  const finalize = useCallback(async () => {
    if (!attempt) return;
    try { await api.post(`/attempts/${attempt.id}/submit`); } catch (e) {}
    setPhase("done");
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
  }, [attempt]);

  const handleAutoSubmit = useCallback(() => {
    toast.error("Auto-submitted due to repeated violations");
    finalize();
  }, [finalize]);

  const { violations, trustScore, lastAlert, logViolation, enterFullscreen } = useProctoring({
    attemptId: attempt?.id,
    enabled: phase === "running",
    onAutoSubmit: handleAutoSubmit,
  });

  const { videoRef, status: camStatus, faces, micStatus, error: camError, captureFrame } = useWebcam({
    enabled: phase !== "done",
    onEvent: logViolation,
  });
  const { videoRef: screenVideoRef, status: screenStatus, error: screenError, start: startScreenShare, stop: stopScreenShare } = useScreenShare({
    enabled: phase === "running",
    onEvent: logViolation,
  });

  const begin = async () => {
    try {
      if (Object.keys(faceCaptures).length < 3) {
        toast.error("Please complete the front, right, and left face scan before starting");
        return;
      }
      if (!["ready", "loading-ai"].includes(camStatus)) {
        toast.error(camError || "Camera and microphone permission are required before starting");
        return;
      }
      const screenOk = await startScreenShare();
      if (!screenOk) {
        toast.error("Screen sharing is mandatory before starting the exam");
        return;
      }
      const r = await api.post("/attempts/start", { quiz_id: quizId });
      setAttempt(r.data);
      await enterFullscreen();
      setPhase("running");
      setTimeLeft((quiz?.duration_minutes || 20) * 60);
      loadNext(r.data.id);
    } catch (e) {
      stopScreenShare();
      toast.error(e?.response?.data?.detail || "Unable to start");
    }
  };

  const loadNext = async (attemptId) => {
    setSelected(null);
    setCodeAnswer("");
    try {
      const r = await api.get(`/attempts/${attemptId}/next`);
      if (r.data.done) {
        await finalize();
        return;
      }
      setQuestion(r.data.question);
      setSelectedLanguage(r.data.question.language || "python");
      setCodeAnswer(r.data.question.starter_code || "");
      questionStartRef.current = Date.now();
    } catch (e) {
      toast.error("Failed to load next question");
    }
  };

  const submitAnswer = async () => {
    if (!question || submitting) return;
    const isCoding = question.question_type === "coding";
    if (!isCoding && selected === null) return;
    setSubmitting(true);
    try {
      await api.post("/attempts/answer", {
        attempt_id: attempt.id,
        question_id: question.id,
        selected_index: isCoding ? -1 : selected,
        code_answer: isCoding ? codeAnswer : "",
        language: selectedLanguage,
        time_taken_seconds: (Date.now() - questionStartRef.current) / 1000,
      });
      loadNext(attempt.id);
    } catch (e) {
      toast.error("Failed to submit answer");
    } finally { setSubmitting(false); }
  };

  const captureFace = (pose) => {
    if (faces !== 1) {
      toast.error("Exactly one face must be visible for face scan");
      return;
    }
    setTimeout(() => {
      const image = captureFrame?.();
      if (!image) {
        toast.error("Unable to capture face. Keep camera visible.");
        return;
      }
      setFaceCaptures((prev) => ({ ...prev, [pose]: image }));
      toast.success(`${pose} face scan captured`);
    }, 3000);
    toast.message("Hold still. Capturing in 3 seconds.");
  };

  // Global timer
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); finalize(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, finalize]);

  useEffect(() => {
    if (phase === "done") stopScreenShare();
  }, [phase, stopScreenShare]);

  if (!quiz) return <div className="p-12 text-zinc-500">Loading exam...</div>;

  if (phase === "intro") {
    const systemOk = ["ready", "loading-ai"].includes(camStatus) && micStatus === "active";
    const faceOk = ["front", "right", "left"].every((p) => faceCaptures[p]);
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white p-4 sm:p-6 lg:p-12" data-testid="quiz-intro">
        <div className="max-w-5xl mx-auto card-flat p-5 sm:p-8 lg:p-10 rounded-lg">
          <div className="label-mono">AI video proctoring onboarding</div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mt-2">{quiz.title}</h1>
          <p className="text-zinc-600 mt-3">{quiz.description}</p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden">
            <Box label="Duration" value={`${quiz.duration_minutes} min`}/>
            <Box label="Questions" value={quiz.total_questions}/>
            <Box label="Type" value={quiz.question_type || "mcq"}/>
            <Box label="Max violations" value={quiz.max_violations}/>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 lg:gap-6">
            <div className="card-flat p-0 overflow-hidden relative bg-black aspect-video">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover"/>
              <div className="absolute top-2 right-2 text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded-sm">
                {camStatus === "ready" || camStatus === "loading-ai" ? `${faces} face${faces !== 1 ? "s" : ""}` : camStatus}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {["instructions", "system", "details", "face", "verification"].map((step, i) => (
                  <button key={step} onClick={() => setOnboardingStep(step)}
                    className={`p-2 border rounded-sm text-left font-mono uppercase ${onboardingStep === step ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>
                    {i + 1}. {step}
                  </button>
                ))}
              </div>

              {onboardingStep === "instructions" && (
                <div className="mt-5 border-l-2 border-rose-600 pl-4 text-sm text-zinc-700 space-y-2 font-mono max-h-72 overflow-auto">
                  <div>Take the assessment in one go, preferably in an incognito window.</div>
                  <div>Stay in fullscreen and keep the assessment tab active. Out-of-window activity is a violation.</div>
                  <div>Looking away, moving away, no face, multiple faces, or suspicious objects may terminate the assessment.</div>
                  <div>Use a laptop/PC only in a well-lit room with a plain background. Mobiles/tablets are not permitted.</div>
                  <div>Camera, microphone, face scan, and entire-screen sharing are mandatory.</div>
                  <label className="flex items-center gap-2 pt-3">
                    <input type="checkbox" checked={instructionsAccepted} onChange={(e) => setInstructionsAccepted(e.target.checked)}/>
                    I have read and accept the proctoring instructions.
                  </label>
                </div>
              )}

              {onboardingStep === "system" && (
                <div className="mt-5 space-y-2 text-xs">
                  <Info icon={<Camera className="w-3 h-3"/>} label="Camera" value={camStatus === "ready" || camStatus === "loading-ai" ? "Active" : (camError || camStatus)} ok={camStatus === "ready" || camStatus === "loading-ai"}/>
                  <Info icon={<Mic className="w-3 h-3"/>} label="Microphone" value={micStatus === "active" ? "Active" : micStatus} ok={micStatus === "active"}/>
                  <Info icon={<Eye className="w-3 h-3"/>} label="Face detection" value={faces === 1 ? "One face visible" : `${faces} faces`} ok={faces === 1}/>
                  <Info icon={<MonitorUp className="w-3 h-3"/>} label="Screen share" value="Requested at final start step" ok={true}/>
                </div>
              )}

              {onboardingStep === "details" && (
                <div className="mt-5 space-y-3">
                  <div className="text-sm text-zinc-600">Verify your assessment details before proceeding to face scan.</div>
                  <div className="grid grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
                    <Box label="Assessment" value={quiz.title}/>
                    <Box label="Mode" value={`${quiz.question_type || "mcq"} proctored`}/>
                  </div>
                  <Button onClick={() => setPersonalSaved(true)} className="rounded-sm bg-zinc-900 hover:bg-zinc-800"><UserRound className="w-4 h-4 mr-2"/>Save and proceed</Button>
                </div>
              )}

              {onboardingStep === "face" && (
                <div className="mt-5">
                  <div className="text-sm text-zinc-600">Capture a 180-degree face scan: front, right, and left. Each capture is taken after 3 seconds.</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {["front", "right", "left"].map((pose) => (
                      <Button key={pose} variant={faceCaptures[pose] ? "default" : "outline"} onClick={() => captureFace(pose)} className="rounded-sm">
                        {faceCaptures[pose] ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <Camera className="w-4 h-4 mr-2"/>}{pose}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {onboardingStep === "verification" && (
                <div className="mt-5 space-y-2 text-xs">
                  <Info icon={<CheckCircle2 className="w-3 h-3"/>} label="Instructions" value={instructionsAccepted ? "Accepted" : "Pending"} ok={instructionsAccepted}/>
                  <Info icon={<CheckCircle2 className="w-3 h-3"/>} label="System check" value={systemOk ? "Passed" : "Pending"} ok={systemOk}/>
                  <Info icon={<CheckCircle2 className="w-3 h-3"/>} label="Details" value={personalSaved ? "Saved" : "Pending"} ok={personalSaved}/>
                  <Info icon={<CheckCircle2 className="w-3 h-3"/>} label="Face scan" value={faceOk ? "Complete" : "Pending"} ok={faceOk}/>
                  <div className="pt-3 text-sm text-zinc-600">On start, choose <b>Entire screen</b> in the browser sharing dialog.</div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Button onClick={begin} disabled={!instructionsAccepted || !systemOk || !personalSaved || !faceOk} className="rounded-sm bg-zinc-900 hover:bg-zinc-800 h-11 px-6" data-testid="begin-exam-button">
              Start assessment and share entire screen
            </Button>
            <Button variant="outline" className="rounded-sm h-11" onClick={() => nav("/student")} data-testid="cancel-exam-button">Back</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6" data-testid="quiz-done">
        <div className="max-w-md text-center border border-zinc-200 rounded-sm p-10">
          <Shield className="w-10 h-10 mx-auto text-emerald-600"/>
          <h2 className="font-heading text-2xl font-semibold mt-4">Response recorded</h2>
          <p className="text-sm text-zinc-600 mt-2">Thank you. Your exam has been submitted. Results are confidential and will be reviewed by the administrator.</p>
          <Button className="mt-6 rounded-sm bg-zinc-900 hover:bg-zinc-800" onClick={() => nav("/student")} data-testid="back-to-dashboard">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Running
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const showAlert = lastAlert && Date.now() - lastAlert.at < 3000;

  return (
    <div className="min-h-screen bg-zinc-50/40 quiz-mode flex flex-col" data-testid="quiz-running">
      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <div className="label-mono">Live exam</div>
            <div className="font-heading text-base sm:text-lg font-semibold mt-0.5">{quiz.title}</div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <Button variant="outline" onClick={() => {
              const msg = `Submit assessment?\nMarked for review: ${markedReview.size}\nSkipped: ${skipped.size}`;
              if (window.confirm(msg)) finalize();
            }} className="rounded-sm">Submit</Button>
            <TrustGauge score={trustScore}/>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-zinc-500"/>
              <span className="font-mono text-xl" data-testid="quiz-timer">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Violation banner */}
      {showAlert && (
        <div className="bg-rose-600 text-white py-2 px-4 sm:px-6 text-xs sm:text-sm font-mono flex items-center gap-2" data-testid="violation-banner">
          <AlertTriangle className="w-4 h-4"/>Violation detected: {lastAlert.type.replace(/_/g, " ")} - This has been logged.
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex">
        <div className="flex-1 p-4 sm:p-6 lg:p-12 max-w-4xl mx-auto w-full">
          <div className="xl:hidden mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Info icon={<Camera className="w-3 h-3"/>} label="Cam" value={camStatus === "ready" ? "On" : camStatus} ok={camStatus === "ready"}/>
            <Info icon={<Mic className="w-3 h-3"/>} label="Mic" value={micStatus === "active" ? "On" : micStatus} ok={micStatus === "active"}/>
            <Info icon={<Eye className="w-3 h-3"/>} label="Faces" value={faces} ok={faces === 1}/>
            <Info icon={<Shield className="w-3 h-3"/>} label="Viol." value={violations.length} ok={violations.length < (quiz.max_violations - 1)}/>
          </div>
          {!question ? <div className="text-zinc-500">Loading question...</div> : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <div className="label-mono">Question {question.question_number} / {question.total}</div>
                <div className="flex items-center gap-2">
                  <span className="label-mono">Topic - {question.topic}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm ${DIFF_COLORS[question.difficulty]}`}>{question.difficulty}</span>
                </div>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-semibold leading-snug tracking-tight" data-testid="question-text">
                {question.text}
              </h2>
              {question.question_type === "coding" ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-mono"><Code2 className="w-4 h-4"/> Language</div>
                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="border border-zinc-300 bg-white rounded-sm px-3 py-2 text-sm w-full sm:w-auto">
                      {(quiz.allowed_languages || ["python", "javascript", "java", "csharp"]).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <textarea value={codeAnswer} onChange={(e) => setCodeAnswer(e.target.value)}
                    className="w-full min-h-[260px] sm:min-h-[320px] bg-zinc-950 text-zinc-100 font-mono text-sm p-4 rounded-sm border border-zinc-800"
                    spellCheck={false}/>
                  {(question.sample_input || question.sample_output) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <pre className="p-3 border border-zinc-200 rounded-sm overflow-auto">Input{"\n"}{question.sample_input}</pre>
                      <pre className="p-3 border border-zinc-200 rounded-sm overflow-auto">Output{"\n"}{question.sample_output}</pre>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCodeAnswer(question.starter_code || "")} className="rounded-sm"><RotateCcw className="w-4 h-4 mr-2"/>Reset</Button>
                    <Button variant="outline" onClick={() => toast.message("Compile & Run is a UI stub. Server-side sandbox execution can be added next.")} className="rounded-sm">Compile & Run</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-3">
                  {(question.options || []).map((opt, i) => (
                    <button key={i}
                      onClick={() => setSelected(i)}
                      className={`w-full text-left p-4 border rounded-sm btn-hover ${selected === i ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50"}`}
                      data-testid={`option-${i}`}>
                      <span className="font-mono text-xs mr-3">{String.fromCharCode(65 + i)}</span>{opt}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => { setMarkedReview((prev) => new Set(prev).add(question.id)); toast.message("Marked for review"); }} className="rounded-sm">Mark for review</Button>
                  <Button variant="outline" onClick={() => { setSkipped((prev) => new Set(prev).add(question.id)); loadNext(attempt.id); }} className="rounded-sm">Skip</Button>
                </div>
                <Button onClick={submitAnswer} disabled={(question.question_type !== "coding" && selected === null) || submitting}
                  className="rounded-sm bg-zinc-900 hover:bg-zinc-800 h-11 px-8" data-testid="submit-answer-button">
                  {submitting ? "Submitting..." : question.question_type === "coding" ? "Submit code" : "Submit & Next ->"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="w-80 border-l border-zinc-200 p-5 bg-zinc-50 hidden xl:block">
          <div className="label-mono mb-3">Proctoring feed</div>
          <div className="card-flat p-0 overflow-hidden relative bg-black aspect-video">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover"/>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded-sm">
              <span className="live-dot" style={{width: 6, height: 6}}/> REC
            </div>
            <div className="absolute top-2 right-2 text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded-sm">
              {camStatus === "ready" ? `${faces} face${faces !== 1 ? "s" : ""}` : camStatus}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <Info icon={<Camera className="w-3 h-3"/>} label="Camera" value={camStatus === "ready" ? "Active" : camStatus} ok={camStatus === "ready"}/>
            <Info icon={<Mic className="w-3 h-3"/>} label="Mic" value={micStatus === "active" ? "Active" : micStatus} ok={micStatus === "active"}/>
            <Info icon={<MonitorUp className="w-3 h-3"/>} label="Screen" value={screenStatus === "active" ? "Sharing" : (screenError || screenStatus)} ok={screenStatus === "active"}/>
            <Info icon={<Eye className="w-3 h-3"/>} label="Faces" value={faces} ok={faces === 1}/>
            <Info icon={<Shield className="w-3 h-3"/>} label="Violations" value={violations.length} ok={violations.length < (quiz.max_violations - 1)}/>
          </div>
          <video ref={screenVideoRef} muted playsInline className="hidden"/>
          <div className="mt-6">
            <div className="label-mono mb-2">Recent events</div>
            <div className="space-y-1.5 max-h-64 overflow-auto no-scrollbar">
              {violations.slice(-10).reverse().map((v, i) => (
                <div key={i} className="text-[11px] font-mono flex items-center justify-between text-zinc-600 border-b border-zinc-200 py-1">
                  <span className="truncate">{v.type.replace(/_/g, " ")}</span>
                  <span className={`text-[10px] ${v.severity === "high" ? "text-rose-600" : "text-amber-600"}`}>{v.severity}</span>
                </div>
              ))}
              {violations.length === 0 && <div className="text-xs text-zinc-400 font-mono">No events</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TrustGauge({ score }) {
  const col = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-2" data-testid="trust-gauge">
      <div className="label-mono">Trust</div>
      <div className={`font-mono text-xl ${col}`}>{score.toFixed(1)}</div>
    </div>
  );
}
function Box({ label, value }) {
  return <div className="bg-white p-4"><div className="label-mono">{label}</div><div className="font-mono text-xl mt-1">{value}</div></div>;
}
function Info({ icon, label, value, ok }) {
  return (
    <div className="flex items-center justify-between p-2 border border-zinc-200 bg-white rounded-sm">
      <div className="flex items-center gap-2 text-zinc-600">{icon}<span>{label}</span></div>
      <div className={`font-mono ${ok ? "text-emerald-700" : "text-rose-600"}`}>{String(value)}</div>
    </div>
  );
}
