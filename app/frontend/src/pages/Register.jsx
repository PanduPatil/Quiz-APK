import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be >= 6 chars"); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created");
      nav("/student");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white" data-testid="register-page">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6 border border-zinc-200 p-8 rounded-sm" data-testid="register-form">
        <Link to="/" className="flex items-center gap-2" data-testid="register-logo-link">
          <div className="w-8 h-8 bg-zinc-900 text-white flex items-center justify-center font-heading font-bold text-sm">Q</div>
          <span className="font-heading font-semibold tracking-tight">QuizAPK/portal</span>
        </Link>
        <div>
          <div className="label-mono mb-1">Candidate onboarding</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Create account</h1>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="label-mono" htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 rounded-sm" data-testid="register-name-input" />
          </div>
          <div>
            <Label className="label-mono" htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 rounded-sm" data-testid="register-email-input" />
          </div>
          <div>
            <Label className="label-mono" htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2 rounded-sm" data-testid="register-password-input" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800 h-11" data-testid="register-submit-button">
          {loading ? "Creating..." : "Create account ->"}
        </Button>
        <div className="text-sm text-zinc-500">
          Already registered? <Link to="/login" className="underline text-zinc-900" data-testid="register-to-login-link">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
