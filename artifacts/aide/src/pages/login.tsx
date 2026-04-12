import { useState, useEffect } from "react";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AideFavicon, AideWordmark } from "@/components/AideLogo";
import AideSplash from "@/components/AideSplash";

interface LoginProps {
  onLogin: (token: string, user: { id: string; username: string; displayName: string; role: string; mustChangePassword: boolean }) => void;
}

// sessionStorage key — splash runs once per browser session so signing out
// mid-session doesn't force the user to wait another 10 seconds.
const SPLASH_SEEN_KEY = "aide-splash-seen";

export default function Login({ onLogin }: LoginProps) {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showSplash) {
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, "1"); } catch { /* ignore */ }
    }
  }, [showSplash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
      onLogin(data.token, data.user);
    } catch {
      setError("Connection failed. Please try again.");
    }
    setLoading(false);
  };

  if (showSplash) {
    return <AideSplash durationMs={10000} onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0b1014] flex items-center justify-center mx-auto mb-4 border border-[#1e293b]">
            <AideFavicon color="#22d3ee" size={36} />
          </div>
          <AideWordmark color="#0891b2" height={34} className="dark:hidden" />
          <AideWordmark color="#22d3ee" height={34} className="hidden dark:block" />
          <p className="text-sm text-muted-foreground mt-2">FlameSafe Service Ops</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus autoComplete="username"
                className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !username.trim() || !password}
            className={cn("w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
              loading || !username.trim() || !password ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
            )}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-6">FlameSafe Fire Protection &middot; Rydalmere NSW</p>
      </div>
    </div>
  );
}
