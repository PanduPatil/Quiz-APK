import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#18181B", "#71717A", "#2563EB", "#E11D48", "#F59E0B"];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then(r => setStats(r.data)); }, []);

  return (
    <div className="p-8 lg:p-12" data-testid="admin-dashboard">
      <div className="label-mono">Control room</div>
      <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">Overview</h1>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200">
        <Stat label="Candidates" value={stats?.total_students ?? "-"}/>
        <Stat label="Quizzes" value={stats?.total_quizzes ?? "-"}/>
        <Stat label="Attempts" value={stats?.total_attempts ?? "-"}/>
        <Stat label="Flagged" value={stats?.flagged_users ?? "-"} danger={stats?.flagged_users > 0}/>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Score distribution" subtitle="Across all completed attempts">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.score_distribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7"/>
              <XAxis dataKey="bucket" stroke="#71717A" fontSize={12}/>
              <YAxis stroke="#71717A" fontSize={12}/>
              <Tooltip contentStyle={{ border: "1px solid #E4E4E7", borderRadius: 2 }}/>
              <Bar dataKey="count" fill="#18181B"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Topic-wise accuracy" subtitle="Average % correct per topic">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.topic_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7"/>
              <XAxis dataKey="topic" stroke="#71717A" fontSize={12}/>
              <YAxis stroke="#71717A" fontSize={12}/>
              <Tooltip contentStyle={{ border: "1px solid #E4E4E7", borderRadius: 2 }}/>
              <Bar dataKey="accuracy" fill="#2563EB"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Violation breakdown" subtitle="Count by type">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats?.violations_breakdown || []} dataKey="count" nameKey="type" outerRadius={90}>
                {(stats?.violations_breakdown || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #E4E4E7", borderRadius: 2 }}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Session health" subtitle="Live platform telemetry">
          <div className="grid grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
            <MiniStat label="In progress" value={stats?.in_progress ?? 0}/>
            <MiniStat label="Completed" value={stats?.completed ?? 0}/>
            <MiniStat label="Total violations" value={stats?.total_violations ?? 0}/>
            <MiniStat label="Flagged users" value={stats?.flagged_users ?? 0}/>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className="bg-white p-6">
      <div className="label-mono">{label}</div>
      <div className={`font-mono text-3xl mt-2 ${danger ? "text-rose-600" : ""}`}>{value}</div>
    </div>
  );
}
function Card({ title, subtitle, children }) {
  return (
    <div className="card-flat p-6">
      <div className="label-mono">{subtitle}</div>
      <h3 className="font-heading text-xl font-semibold mt-1 mb-4">{title}</h3>
      {children}
    </div>
  );
}
function MiniStat({ label, value }) {
  return (
    <div className="bg-white p-4">
      <div className="label-mono">{label}</div>
      <div className="font-mono text-2xl mt-1">{value}</div>
    </div>
  );
}
