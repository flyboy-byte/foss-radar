import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, register } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Radar } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => register(email.trim(), password),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      toast({ title: "Welcome to FOSS Radar", description: "Your starter library is ready." });
      navigate("/");
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      toast({ title: message, variant: "destructive" });
    },
  });

  const isValid = email.trim().length > 0 && password.length >= 8;

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
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Email</label>
            <Input
              type="email"
              className="bg-secondary/20 border-white/5 focus-visible:ring-primary/50 font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              data-testid="input-email"
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
            <p className="text-[10px] font-mono text-muted-foreground/50">At least 8 characters.</p>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!isValid || mutation.isPending}
            data-testid="button-register"
          >
            {mutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground font-mono">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
