import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Brain, Activity, Lock, Eye, BarChart3, ArrowUpRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900" data-testid="landing-page">
      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-heading font-bold text-sm">Q</div>
            <span className="font-heading font-semibold text-lg tracking-tight">QuizAPK<span className="text-zinc-400">/portal</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="nav-login-link">
              <Button variant="ghost" className="rounded-sm text-sm">Sign in</Button>
            </Link>
            <Link to="/register" data-testid="nav-register-link">
              <Button className="rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white text-sm">Request access</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-zinc-200 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f4f4f5_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#09090b_0%,#18181b_100%)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-14 md:py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="label-mono mb-6" data-testid="hero-tagline">Enterprise Exam Infrastructure - v1.0</div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              AI-proctored assessments.<br/>
              <span className="text-zinc-500 dark:text-zinc-300">Built for production.</span>
            </h1>
            <p className="mt-8 text-base md:text-lg text-zinc-600 dark:text-zinc-300 max-w-xl leading-relaxed">
              Run secure, adaptive, cheat-resistant online exams. Webcam proctoring, adaptive difficulty, real-time integrity scoring.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link to="/login" data-testid="hero-cta-signin">
                <Button className="rounded-sm bg-zinc-900 hover:bg-zinc-800 text-white h-11 px-6">
                  Sign in to portal <ArrowUpRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/register" data-testid="hero-cta-candidate">
                <Button variant="outline" className="rounded-sm h-11 px-6 border-zinc-300">
                  Candidate registration
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 label-mono">
              <div>ISO-grade &nbsp;-&nbsp; JWT auth</div>
              <div>Adaptive engine</div>
              <div>Live integrity feed</div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="card-flat p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <span className="label-mono">Control Room Preview</span>
                <span className="flex items-center gap-2 text-xs text-zinc-500"><span className="live-dot"/> LIVE</span>
              </div>
              <div className="py-5 grid grid-cols-2 gap-4">
                <Metric label="Active exams" value="42" />
                <Metric label="Trust score avg." value="87.4" />
                <Metric label="Flags - last hour" value="3" danger />
                <Metric label="Auto-submits" value="1" danger />
              </div>
              <div className="border-t border-zinc-200 pt-4 space-y-2">
                <Row name="Kavya M." action="Tab switch" sev="high"/>
                <Row name="Rahul S." action="Face lost 6s" sev="high"/>
                <Row name="Aditi R." action="Copy attempt" sev="med"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 md:py-20">
        <div className="label-mono mb-4">Capabilities</div>
        <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
          Everything a hiring test platform needs. Nothing it doesn't.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
          <Feature icon={<Brain/>} title="Adaptive Engine" desc="Difficulty adjusts on the fly. Correct answers pull harder questions, wrong answers ease the load."/>
          <Feature icon={<ShieldCheck/>} title="Live Proctoring" desc="Tab switches, focus loss, paste attempts and devtools shortcuts are detected and logged."/>
          <Feature icon={<Eye/>} title="Webcam Monitoring" desc="On-device face detection flags missing or multiple faces during the session."/>
          <Feature icon={<Activity/>} title="Trust Score" desc="A transparent 0-100 integrity score per candidate, computed live from behaviour and violations."/>
          <Feature icon={<Lock/>} title="Admin-only Results" desc="Candidates only see pending/completed status. Scores and rankings stay with the administrator."/>
          <Feature icon={<BarChart3/>} title="Analytics" desc="Score distribution, topic-wise accuracy, violation breakdown, full ranking - charts included."/>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>(c) 2026 QuizAPK Portal - Production exam infrastructure.</div>
          <div className="label-mono">Built for enterprise - Secured by design</div>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value, danger }) {
  return (
    <div className="border border-zinc-200 p-3">
      <div className="label-mono">{label}</div>
      <div className={`mt-1 font-mono text-2xl ${danger ? "text-rose-600" : "text-zinc-900"}`}>{value}</div>
    </div>
  );
}
function Row({ name, action, sev }) {
  const col = sev === "high" ? "bg-rose-600" : "bg-amber-500";
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3"><span className={`w-1.5 h-1.5 rounded-full ${col}`}/> {name}</div>
      <div className="text-zinc-500 font-mono text-xs">{action}</div>
    </div>
  );
}
function Feature({ icon, title, desc }) {
  return (
    <div className="bg-white p-8" data-testid={`feature-${title.toLowerCase().replace(/\s/g,'-')}`}>
      <div className="w-9 h-9 border border-zinc-200 flex items-center justify-center mb-5 text-zinc-900">
        {React.cloneElement(icon, { className: "w-4 h-4" })}
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{desc}</p>
    </div>
  );
}
