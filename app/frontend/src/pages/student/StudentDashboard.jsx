import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Clock, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/quizzes").then((r) => setQuizzes(r.data)),
      api.get("/attempts/my").then((r) => setAttempts(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const statusOf = (quizId) => {
    const a = attempts.find((x) => x.quiz_id === quizId);
    return a?.status || "pending";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50/60" data-testid="student-dashboard">
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" data-testid="student-logo-link">
            <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-heading font-bold text-sm">Q</div>
            <span className="font-heading font-semibold tracking-tight">QuizAPK/portal</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-zinc-500">{user?.email}</div>
            </div>
            <Button variant="outline" size="sm" className="rounded-sm" onClick={() => { logout(); nav("/"); }} data-testid="student-logout-button">
              <LogOut className="w-4 h-4 mr-2"/>Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="label-mono">Candidate portal</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-2">Your assessments</h1>
        <p className="text-zinc-600 mt-2 max-w-2xl">
          Only assessments assigned to you are visible below. Results remain confidential with the administrator per platform policy.
        </p>

        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 rounded-md overflow-hidden">
          <Stat label="Assigned" value={quizzes.length}/>
          <Stat label="Completed" value={attempts.filter(a => a.status !== "in_progress").length}/>
          <Stat label="Pending" value={quizzes.length - attempts.filter(a => a.status !== "in_progress").length}/>
        </div>

        <section className="mt-12">
          <div className="label-mono mb-4">Assigned exams</div>
          {loading ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : quizzes.length === 0 ? (
            <div className="card-flat p-8 text-center">
              <div className="text-zinc-500">No exams assigned yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((q) => {
                const st = statusOf(q.id);
                return (
                  <div key={q.id} className="card-flat p-5 sm:p-6 rounded-lg btn-hover" data-testid={`quiz-card-${q.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="label-mono">{q.topics?.join(" - ") || "General"}</div>
                      <StatusBadge status={st}/>
                    </div>
                    <h3 className="font-heading text-xl font-semibold mt-3">{q.title}</h3>
                    <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{q.description}</p>
                    <div className="mt-5 flex items-center gap-6 text-xs text-zinc-500 font-mono">
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/>{q.duration_minutes} min</div>
                      <div>{q.total_questions} questions</div>
                      {q.adaptive && <div className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/>Adaptive</div>}
                    </div>
                    <div className="mt-6 border-t border-zinc-100 pt-4 flex items-center justify-between">
                      {st === "completed" || st === "auto_submitted" ? (
                        <div className="text-xs text-zinc-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/>Response recorded</div>
                      ) : (
                        <Button onClick={() => nav(`/student/quiz/${q.id}`)}
                          className="rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid={`start-quiz-${q.id}`}>
                          {st === "in_progress" ? "Resume exam" : "Begin exam"} <ArrowRight className="w-4 h-4 ml-2"/>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white p-6">
      <div className="label-mono">{label}</div>
      <div className="font-mono text-3xl mt-2">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { text: "Completed", cls: "bg-zinc-900 text-white" },
    auto_submitted: { text: "Auto-submitted", cls: "bg-rose-600 text-white" },
    in_progress: { text: "In progress", cls: "bg-amber-500 text-white" },
    pending: { text: "Pending", cls: "bg-zinc-100 text-zinc-900 border border-zinc-200" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm ${s.cls}`}>{s.text}</span>;
}
