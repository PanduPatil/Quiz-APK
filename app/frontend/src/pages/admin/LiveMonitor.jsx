import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Activity, Shield, ShieldAlert, AlertTriangle, 
  Clock, RefreshCw, FileText, CheckCircle2, User
} from "lucide-react";

export default function LiveMonitor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const load = async () => {
    try {
      const r = await api.get("/admin/live");
      setRows(r.data);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString());
    } catch (e) {
      console.error("Failed to load live logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  // Compute overall stats
  const totalActive = rows.length;
  const avgTrust = totalActive > 0 ? rows.reduce((acc, curr) => acc + curr.trust_score, 0) / totalActive : 100;
  const flaggedCount = rows.filter(r => r.trust_score < 75).length;

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "high": return "bg-rose-50 border-rose-200 text-rose-700 font-semibold";
      case "medium": return "bg-amber-50 border-amber-200 text-amber-700 font-semibold";
      default: return "bg-zinc-50 border-zinc-200 text-zinc-600";
    }
  };

  const getViolationLabel = (type) => {
    return type
      .replace(/_/g, " ")
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="p-8 lg:p-12 min-h-screen bg-zinc-50/50" data-testid="live-monitor">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6 mb-8">
        <div>
          <div className="label-mono flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time Proctoring Engine
          </div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight mt-2 text-zinc-900">
            Live Assessment Monitor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-3 py-1.5 border border-zinc-200 shadow-sm rounded-md text-xs font-mono text-zinc-500 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
            Active Refresh (4s) | Last: {lastUpdated || "Syncing"}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-5 border border-zinc-200/80 shadow-sm rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase">Active Candidates</div>
            <div className="text-3xl font-extrabold font-heading text-zinc-900 mt-1">{totalActive}</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-200/80 shadow-sm rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase">Avg Exam Integrity</div>
            <div className={`text-3xl font-extrabold font-heading mt-1 ${avgTrust >= 80 ? "text-emerald-600" : avgTrust >= 50 ? "text-amber-500" : "text-rose-600"}`}>
              {avgTrust.toFixed(1)}%
            </div>
          </div>
          <div className={`p-3 rounded-lg ${avgTrust >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-500"}`}>
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-200/80 shadow-sm rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase">Flagged Candidates</div>
            <div className="text-3xl font-extrabold font-heading text-rose-600 mt-1">{flaggedCount}</div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Exam Grid */}
      {rows.length === 0 ? (
        <div className="mt-10 bg-white border border-zinc-200 p-12 text-center text-zinc-500 rounded-lg shadow-sm">
          <Activity className="w-12 h-12 text-zinc-300 mx-auto mb-4 animate-pulse" />
          <div className="text-lg font-semibold text-zinc-700">No Active Assessments</div>
          <p className="text-sm text-zinc-400 mt-1">Waiting for candidates to start their exams...</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
          {rows.map((r) => {
            const trust = r.trust_score;
            const trustColor = trust >= 80 ? "#10b981" : trust >= 50 ? "#f59e0b" : "#f43f5e";
            const trustBgClass = trust >= 80 ? "text-emerald-600" : trust >= 50 ? "text-amber-500" : "text-rose-600";
            
            // Circular SVG logic
            const radius = 28;
            const strokeWidth = 5;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (trust / 100) * circumference;

            return (
              <div 
                key={r.attempt_id} 
                className="bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200 p-6 rounded-xl flex flex-col justify-between gap-6"
                data-testid={`live-row-${r.attempt_id}`}
              >
                {/* Top Section */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      {r.quiz_title}
                    </span>
                    <div className="font-heading text-xl font-bold mt-2 text-zinc-900">
                      {r.user_name}
                    </div>
                    <div className="text-sm text-zinc-500 font-mono mt-0.5">
                      {r.user_email}
                    </div>
                  </div>

                  {/* Trust Score Animated SVG Gauge */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative flex items-center justify-center w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Background Ring */}
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          stroke="#e4e4e7"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                        />
                        {/* Interactive Circular Progress */}
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          stroke={trustColor}
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      {/* Central Percentage */}
                      <span className={`absolute font-mono font-black text-sm tracking-tighter ${trustBgClass}`}>
                        {Math.round(trust)}%
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold font-mono">Integrity</span>
                  </div>
                </div>

                {/* Progress bar and Violations count */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-150 p-4 rounded-lg">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider font-bold">Progress</div>
                    <div className="font-mono text-base font-extrabold text-zinc-700 mt-0.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-zinc-400" />
                      {r.progress}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider font-bold">Total Violations</div>
                    <div className={`font-mono text-base font-extrabold mt-0.5 flex items-center gap-1.5 ${r.violations_count > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {r.violations_count > 0 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {r.violations_count}
                    </div>
                  </div>
                </div>

                {/* Scrolling Timeline Events Log (WOW Factor) */}
                <div className="flex-1 flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-400 mb-3">
                    Assessment Timeline Feed
                  </div>
                  {r.recent_violations && r.recent_violations.length > 0 ? (
                    <div className="relative pl-6 space-y-4 max-h-[160px] overflow-y-auto pr-1">
                      {/* Timeline vertical thread line */}
                      <div className="absolute top-1 left-2.5 w-0.5 bottom-2 border-l border-zinc-200 border-dashed"></div>

                      {r.recent_violations.map((v, i) => (
                        <div key={i} className="relative flex flex-col gap-1">
                          {/* Circular event node marker */}
                          <div className={`absolute -left-[20.5px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-white ${v.severity === "high" ? "border-rose-500 animate-pulse" : v.severity === "medium" ? "border-amber-500" : "border-zinc-400"}`}></div>

                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold text-zinc-800">
                              {getViolationLabel(v.type)}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wide border px-1.5 py-0.2 rounded font-mono ${getSeverityColor(v.severity)}`}>
                              {v.severity}
                            </span>
                          </div>

                          {v.details && (
                            <p className="text-[11px] text-zinc-500 bg-zinc-50 p-2 border border-zinc-100 rounded mt-0.5">
                              {v.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 italic bg-zinc-50/50 text-center py-6 border border-zinc-200/50 rounded-lg">
                      🟢 Steady Integrity. No violations detected yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
