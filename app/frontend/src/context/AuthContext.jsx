import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const u = localStorage.getItem("qp_user");
    return u ? JSON.parse(u) : null;
  } catch (e) {
    localStorage.removeItem("qp_token");
    localStorage.removeItem("qp_user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("qp_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("qp_user", JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem("qp_token");
        localStorage.removeItem("qp_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("qp_token", r.data.token);
    localStorage.setItem("qp_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (name, email, password) => {
    const r = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("qp_token", r.data.token);
    localStorage.setItem("qp_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("qp_token");
    localStorage.removeItem("qp_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
