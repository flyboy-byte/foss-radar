import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMe } from "@/lib/api";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project/[id]";
import Discover from "@/pages/discover";
import AddProject from "@/pages/add";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function AuthedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/explore" component={Discover} />
      <Route path="/add" component={AddProject} />
      <Route path="/login"><Redirect to="/" /></Route>
      <Route path="/register"><Redirect to="/" /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function GuestRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route><Redirect to="/login" /></Route>
    </Switch>
  );
}

function Router() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    // 401 throws in getQueryFn's default "throw" behavior — treat any error as "not logged in"
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <AuthedRouter /> : <GuestRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
