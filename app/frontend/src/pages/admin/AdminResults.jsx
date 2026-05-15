import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminResults() {
  const [rows, setRows] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState("all");

  const load = (q) => {
    const url = q && q !== "all" ? `/admin/results?quiz_id=${q}` : "/admin/results";
    api.get(url).then(r => setRows(r.data));
  };
  useEffect(() => { api.get("/quizzes").then(r => setQuizzes(r.data)); load(); }, []);
  useEffect(() => { load(quizId); }, [quizId]);

  return (
    <div className="p-8 lg:p-12" data-testid="admin-results">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono">Ranking - analytics</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">Results</h1>
        </div>
        <div className="w-64">
          <Select value={quizId} onValueChange={setQuizId}>
            <SelectTrigger className="rounded-sm" data-testid="results-filter"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quizzes</SelectItem>
              {quizzes.map(q => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-10 border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="label-mono">
              <th className="text-left p-3">Rank</th>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Quiz</th>
              <th className="text-right p-3">Score</th>
              <th className="text-right p-3">Correct</th>
              <th className="text-right p-3">Trust</th>
              <th className="text-right p-3">Violations</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-zinc-500">No completed attempts.</td></tr>
            )}
            {rows.map((r) => {
              const trustCol = r.trust_score >= 80 ? "text-emerald-600" : r.trust_score >= 50 ? "text-amber-600" : "text-rose-600";
              return (
                <tr key={r.attempt_id} className="border-b border-zinc-100" data-testid={`result-row-${r.attempt_id}`}>
                  <td className="p-3 font-mono">#{r.rank}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.user_name}</div>
                    <div className="text-xs text-zinc-500">{r.user_email}</div>
                  </td>
                  <td className="p-3 text-zinc-600">{r.quiz_title}</td>
                  <td className="p-3 text-right font-mono text-base">{r.score.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono">{r.correct}/{r.total}</td>
                  <td className={`p-3 text-right font-mono ${trustCol}`}>{r.trust_score.toFixed(1)}</td>
                  <td className={`p-3 text-right font-mono ${r.violations_count > 0 ? "text-rose-600" : ""}`}>{r.violations_count}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm ${r.status === "auto_submitted" ? "bg-rose-600 text-white" : "bg-zinc-900 text-white"}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
