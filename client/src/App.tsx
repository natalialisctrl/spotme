import React from "react";
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
import UploadProfilePicture from "@/pages/UploadProfilePicture";
import SecuritySettings from "@/pages/SecuritySettings";
import WorkoutFocus from "@/pages/WorkoutFocus"; // Import the workout focus page
import WorkoutRoutines from "@/pages/WorkoutRoutines"; // Import workout routines page
import ScheduledMeetups from "@/pages/ScheduledMeetups"; // Import scheduled meetups page
import Challenges from "@/pages/Challenges"; // Import challenges page
import Achievements from "@/pages/Achievements"; // Import achievements page

import PartnerRatings from "@/pages/PartnerRatings"; // Import partner ratings page
import Notifications from "@/pages/Notifications"; // Import notifications page

import WorkoutRecommendations from "@/pages/WorkoutRecommendations"; // Import workout recommendations page

import { ChallengeDetail } from "@/components/challenges/ChallengeDetail"; // Import challenge detail component
import AuthPage from "@/pages/AuthPage";
import { Loader2 } from "lucide-react";
import { WorkoutFocusProvider } from "@/context/WorkoutFocusContext"; // Import the workout focus context

function HomePage() {
  return <FindPartners />;
}

function MessagesAndConnectionsPage() {
  return <Messages />;
}

function ProfilePage() {
  // Use the new profile page component with direct fetch approach
  return <NewProfilePage />;
}

function ProfileSetupPage() {
  return <ProfileSetup />;
}

function SecuritySettingsPage() {
  return <SecuritySettings />;
}

function WorkoutFocusPage() {
  return <WorkoutFocus />;
}

function WorkoutRoutinesPage() {
  return <WorkoutRoutines />;
}

function ScheduledMeetupsPage() {
  return <ScheduledMeetups />;
}

function ChallengesPage() {
  return <Challenges />;
}

function AchievementsPage() {
  return <Achievements />;
}

function PartnerRatingsPage() {
  return <PartnerRatings />;
}

function WorkoutRecommendationsPage() {
  return <WorkoutRecommendations />;
}




function ChallengeDetailPage({ params }: { params: { id: string } }) {
  return <ChallengeDetail challengeId={parseInt(params.id, 10)} />;
}

function Router() {
  const { user, isLoading, attemptAutoLogin } = useAuth();
  const [autoLoginAttempted, setAutoLoginAttempted] = React.useState(false);

  // Auto-login is disabled per user request
  React.useEffect(() => {
    if (!autoLoginAttempted) {
      setAutoLoginAttempted(true);
    }
  }, [autoLoginAttempted]);

  if (isLoading || (!user && !autoLoginAttempted)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading...</p>
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
  const needsProfileSetup = !(user as any).aiGeneratedInsights;
  
  if (needsProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/profile-setup" component={ProfileSetupPage} />
          <Route path="/auth" component={AuthPage} />
          <Route>
            <ProfileSetupPage />
          </Route>
        </Switch>
        <Toaster />
      </div>
    );
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/messages" component={MessagesAndConnectionsPage} />
        <Route path="/connections" component={MessagesAndConnectionsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/profile-setup" component={ProfileSetupPage} />
        <Route path="/upload-profile-picture" component={UploadProfilePicture} />
        <Route path="/security-settings" component={SecuritySettingsPage} />
        <Route path="/workout-focus" component={WorkoutFocusPage} />
        <Route path="/workout-routines" component={WorkoutRoutinesPage} />
        <Route path="/scheduled-meetups" component={ScheduledMeetupsPage} />
        <Route path="/challenges" component={ChallengesPage} />
        <Route path="/challenges/:id" component={ChallengeDetailPage} />
        <Route path="/achievements" component={AchievementsPage} />

        <Route path="/notifications" component={Notifications} />

        <Route path="/workout-recommendations" component={WorkoutRecommendationsPage} />


        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <div className="app-container">
      <WorkoutFocusProvider>
        <Router />
        <Toaster />
      </WorkoutFocusProvider>
    </div>
  );
}

export default App;
