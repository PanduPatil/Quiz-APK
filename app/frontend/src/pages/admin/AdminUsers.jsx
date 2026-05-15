import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const load = () => api.get("/admin/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const flag = async (u) => {
    await api.post(`/admin/users/${u.id}/flag`, { flagged: !u.is_flagged });
    toast.success(u.is_flagged ? "Unflagged" : "Flagged");
    load();
  };

  const block = async (u) => {
    if (!u.is_blocked && !window.confirm(`Block ${u.name}?`)) return;
    await api.post(`/admin/users/${u.id}/block`, { blocked: !u.is_blocked });
    toast.success(u.is_blocked ? "Unblocked" : "Blocked");
    load();
  };

  return (
    <div className="p-8 lg:p-12" data-testid="admin-users">
      <div className="label-mono">Candidate roster</div>
      <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">Candidates</h1>

      <div className="mt-10 border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="label-mono">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Trust</th>
              <th className="text-left p-3">Flags</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No candidates yet.</td></tr>}
            {users.map((u) => {
              const col = u.trust_score >= 80 ? "text-emerald-600" : u.trust_score >= 50 ? "text-amber-600" : "text-rose-600";
              return (
                <tr key={u.id} className="border-b border-zinc-100" data-testid={`user-row-${u.id}`}>
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-zinc-600">{u.email}</td>
                  <td className={`p-3 text-right font-mono ${col}`}>{u.trust_score.toFixed(1)}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {u.is_flagged && <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-amber-500 text-white">Flagged</span>}
                      {u.is_blocked && <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-rose-600 text-white">Blocked</span>}
                      {!u.is_flagged && !u.is_blocked && <span className="text-xs text-zinc-400">-</span>}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" className="rounded-sm mr-2" onClick={() => flag(u)} data-testid={`flag-user-${u.id}`}>
                      {u.is_flagged ? "Unflag" : "Flag"}
                    </Button>
                    <Button variant="outline" size="sm" className={`rounded-sm ${u.is_blocked ? "" : "text-rose-600"}`} onClick={() => block(u)} data-testid={`block-user-${u.id}`}>
                      {u.is_blocked ? "Unblock" : "Block"}
                    </Button>
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
