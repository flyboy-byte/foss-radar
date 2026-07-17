import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Radar } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => login(identifier.trim(), password),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      navigate("/");
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Login failed";
      toast({ title: message, variant: "destructive" });
    },
  });

  const isValid = identifier.trim().length > 0 && password.length > 0;

  return (
    <div className="flex h-screen items-center justify-center bg-background selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 z-50 scanlines" />
      <div className="w-full max-w-sm glass-panel rounded-xl border-white/5 p-8 space-y-6 relative z-10">
        <div className="flex items-center gap-2.5 text-primary font-heading font-bold text-xl justify-center">
          <Radar className="w-6 h-6" />
          <span>FOSS Radar</span>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Username or Email</label>
            <Input
              type="text"
              className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              data-testid="input-identifier"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Password</label>
            <Input
              type="password"
              className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!isValid || mutation.isPending}
            data-testid="button-login"
          >
            {mutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground font-mono">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
