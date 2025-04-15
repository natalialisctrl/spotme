import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import NotFound from "@/pages/not-found";
import FindPartners from "@/pages/FindPartners";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import Connections from "@/pages/Connections";
import ProfileSetup from "@/pages/ProfileSetup";
import AuthPage from "@/pages/AuthPage";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={FindPartners} />
        <Route path="/messages" component={Messages} />
        <Route path="/connections" component={Connections} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile-setup" component={ProfileSetup} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={AuthPage} />
      <Route path="/connections" component={AuthPage} />
      <Route path="/profile" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { user, loading, checkAuth } = useAuth();

  useEffect(() => {
    // Check authentication status when the app loads
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      {loading ? (
        <div className="h-screen w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : user ? (
        <AuthenticatedApp />
      ) : (
        <UnauthenticatedApp />
      )}
      <Toaster />
    </>
  );
}

export default App;
