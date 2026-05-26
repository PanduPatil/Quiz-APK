import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutGrid, FileText, Activity, Award, Users, LogOut } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/quizzes", label: "Quizzes", icon: FileText },
  { to: "/admin/live", label: "Live Monitor", icon: Activity },
  { to: "/admin/results", label: "Results", icon: Award },
  { to: "/admin/users", label: "Candidates", icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-50/60 lg:bg-white flex flex-col lg:flex-row" data-testid="admin-layout">
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white flex lg:flex-col">
        <div className="p-5 border-b border-zinc-200">
          <Link to="/admin" className="flex items-center gap-2" data-testid="admin-logo-link">
            <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-heading font-bold text-sm">Q</div>
            <span className="font-heading font-semibold tracking-tight">QuizAPK<span className="text-zinc-400">/admin</span></span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-x-auto lg:overflow-visible no-scrollbar">
          <div className="label-mono px-3 pb-2 pt-3">Workspace</div>
          <div className="flex lg:block gap-1.5 min-w-max">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
                data-testid={`nav-${n.label.toLowerCase().replace(/ /g, "-")}`}>
                <Icon className="w-4 h-4"/>{n.label}
              </NavLink>
            );
          })}
          </div>
          <Button variant="outline" size="sm" className="lg:hidden rounded-md mt-2" onClick={() => { logout(); nav("/"); }}>
            <LogOut className="w-4 h-4 mr-2"/>Logout
          </Button>
        </nav>
        <div className="hidden lg:block p-4 border-t border-zinc-200">
          <div className="text-sm font-medium truncate">{user?.name}</div>
          <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
          <Button variant="outline" size="sm" className="mt-3 w-full rounded-sm" onClick={() => { logout(); nav("/"); }} data-testid="admin-logout-button">
            <LogOut className="w-4 h-4 mr-2"/>Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet/>
      </main>
    </div>
  );
}
