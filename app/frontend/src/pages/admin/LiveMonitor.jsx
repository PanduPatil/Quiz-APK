import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Activity } from "lucide-react";

export default function LiveMonitor() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/admin/live").then(r => setRows(r.data));
  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, []);

  return (
    <div className="p-8 lg:p-12" data-testid="live-monitor">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono">Real-time</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">Live Monitor</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500"><span className="live-dot"/><Activity className="w-4 h-4"/>Refreshing every 4s</div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 card-flat p-10 text-center text-zinc-500">No active exams.</div>
      ) : (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => {
            const trust = r.trust_score;
            const col = trust >= 80 ? "text-emerald-600" : trust >= 50 ? "text-amber-600" : "text-rose-600";
            return (
              <div key={r.attempt_id} className="card-flat p-5" data-testid={`live-row-${r.attempt_id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label-mono">{r.quiz_title}</div>
                    <div className="font-heading text-lg font-semibold mt-1">{r.user_name}</div>
                    <div className="text-xs text-zinc-500">{r.user_email}</div>
                  </div>
                  <div className="text-right">
                    <div className="label-mono">Trust</div>
                    <div className={`font-mono text-2xl ${col}`}>{trust.toFixed(1)}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
                  <div className="bg-white p-2.5"><div className="label-mono">Progress</div><div className="font-mono text-base mt-1">{r.progress}</div></div>
                  <div className="bg-white p-2.5"><div className="label-mono">Violations</div><div className={`font-mono text-base mt-1 ${r.violations_count > 0 ? "text-rose-600" : ""}`}>{r.violations_count}</div></div>
                </div>
                {r.recent_violations?.length > 0 && (
                  <div className="mt-4">
                    <div className="label-mono mb-2">Recent events</div>
                    <div className="space-y-1">
                      {r.recent_violations.slice(0, 4).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-mono">
                          <span>{v.type.replace(/_/g, " ")}</span>
                          <span className={v.severity === "high" ? "text-rose-600" : "text-amber-600"}>{v.severity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
