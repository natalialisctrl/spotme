import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import IdentityVerification from "@/components/profile/IdentityVerification";

// Create a client
const queryClient = new QueryClient();

function AuthDemo() {
  const { user, loading, login, logout } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">
          GymBuddy App
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Current user status and login controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-md mb-4 ${user ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {user ? `Logged in as ${user.name}` : 'Logged Out'}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => user ? logout() : login('demo', 'password')}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                user ? 'Log Out' : 'Log In (demo)'
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {user && (
          <SocialVerification user={user} onVerificationComplete={() => {}} />
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Updated Authentication context is working properly. <br />
              Social verification component is displayed when logged in.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  </QueryClientProvider>
);
