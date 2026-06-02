import { createContext, useContext, useState, useCallback } from "react";

import { apiFetch } from "../lib/api";

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Rehydrate from localStorage on mount
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("padel_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── SIGN UP ──────────────────────────────────────────────────────────────
  // Expects your .NET endpoint: POST /api/auth/register
  // Body: { fullName, email, password }
  // Response: { token, user: { id, fullName, email, elo, ... } }
  const register = useCallback(async ({ fullName, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
      });

      const token = data.token || data.accessToken;
      const userData = data.user || {
        userId: data.userId,
        fullName: data.fullName || fullName,
        email: data.email || email,
        role: data.role,
      };

      localStorage.setItem("padel_token", token);
      localStorage.setItem("padel_user", JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SIGN IN ──────────────────────────────────────────────────────────────
  // Expects your .NET endpoint: POST /api/auth/login
  // Body: { email, password }
  // Response: { token, user: { id, fullName, email, elo, ... } }
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token = data.token || data.accessToken;
      const userData = data.user || {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email || email,
        role: data.role,
      };

      localStorage.setItem("padel_token", token);
      localStorage.setItem("padel_user", JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── LOGOUT ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("padel_token");
    localStorage.removeItem("padel_user");
    setUser(null);
    setError(null);
  }, []);

  // ── CLEAR ERROR ──────────────────────────────────────────────────────────
  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}