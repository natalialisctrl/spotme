import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AppShell from "./components/layout/AppShell";
import NotFound from "@/pages/not-found";
import FindPartners from "@/pages/FindPartners";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import NewProfilePage from "@/pages/NewProfilePage"; // Import the new profile page
import Connections from "@/pages/Connections";
import ProfileSetup from "@/pages/ProfileSetup";
import AuthPage from "@/pages/AuthPage";
import { Loader2 } from "lucide-react";

function HomePage() {
  return <FindPartners />;
}

function MessagesPage() {
  return <Messages />;
}

function ConnectionsPage() {
  return <Connections />;
}

function ProfilePage() {
  // Use the new profile page component with direct fetch approach
  return <NewProfilePage />;
}

function ProfileSetupPage() {
  return <ProfileSetup />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route>
          <AuthPage />
        </Route>
      </Switch>
    );
  }

  // Check if user needs to complete profile setup (has no AI insights)
  const needsProfileSetup = !user.aiGeneratedInsights;
  
  if (needsProfileSetup) {
    return (
      <Switch>
        <Route path="/profile-setup" component={ProfileSetupPage} />
        <Route>
          <ProfileSetupPage />
        </Route>
      </Switch>
    );
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/connections" component={ConnectionsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/profile-setup" component={ProfileSetupPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
