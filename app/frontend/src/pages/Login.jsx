import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name}`);
      nav(u.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white" data-testid="login-page">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-zinc-200 grid-bg">
        <Link to="/" className="flex items-center gap-2" data-testid="login-logo-link">
          <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-heading font-bold text-sm">Q</div>
          <span className="font-heading font-semibold tracking-tight">QuizAPK/portal</span>
        </Link>
        <div>
          <div className="label-mono mb-4">Secure access</div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight max-w-md leading-tight">
            Authorized personnel only. All sessions are logged and monitored.
          </h2>
        </div>
        <div className="label-mono text-zinc-400">AES-JWT - bcrypt - Proctored runtime</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <div className="label-mono mb-2">Portal access</div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-zinc-500 mt-1">Candidates & administrators</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="label-mono" htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required className="mt-2 rounded-sm" data-testid="login-email-input" />
            </div>
            <div>
              <Label className="label-mono" htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required className="mt-2 rounded-sm" data-testid="login-password-input" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800 h-11" data-testid="login-submit-button">
            {loading ? "Signing in..." : "Sign in ->"}
          </Button>
          <div className="text-sm text-zinc-500">
            No account? <Link to="/register" className="underline text-zinc-900" data-testid="login-to-register-link">Register as candidate</Link>
          </div>
          <div className="text-xs text-zinc-400 border-t border-zinc-200 pt-4 font-mono leading-relaxed">
            <div>admin@quizapk.com - Admin@123</div>
            <div>student@quizapk.com - Student@123</div>
          </div>
        </form>
      </div>
    </div>
  );
}
