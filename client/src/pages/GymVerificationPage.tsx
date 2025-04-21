import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import AppShell from "@/components/layout/AppShell";
import { GymVerification } from "@/components/profile/GymVerification";
import { CardTitle, CardDescription, Card, CardHeader, CardContent } from "@/components/ui/card";
import { BuildingIcon, ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const GymVerificationPage = () => {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    toast({
      title: "Authentication required",
      description: "Please log in to access this page",
      variant: "destructive",
    });
    return <Redirect to="/auth" />;
  }

  return (
    <AppShell>
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Settings</CardTitle>
                <CardDescription>
                  Manage your profile and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="flex flex-col">
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full justify-start rounded-none h-12">
                      Profile Information
                    </Button>
                  </Link>
                  <Link href="/workout-focus">
                    <Button variant="ghost" className="w-full justify-start rounded-none h-12">
                      Workout Preferences
                    </Button>
                  </Link>
                  <Link href="/gym-verification">
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start rounded-none h-12 font-medium"
                    >
                      <BuildingIcon className="mr-2 h-4 w-4" />
                      Gym Verification
                    </Button>
                  </Link>
                  <Link href="/security-settings">
                    <Button variant="ghost" className="w-full justify-start rounded-none h-12">
                      Security Settings
                    </Button>
                  </Link>
                </nav>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Link href="/">
                <Button variant="outline" className="flex items-center">
                  <ArrowLeftIcon className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Gym Verification</h1>
              <p className="text-muted-foreground">
                Connect your gym membership to verify your location and find workout partners at the same gym.
              </p>
            </div>

            <GymVerification 
              userId={user.id}
              currentGymName={user.gymName}
              currentGymChain={user.gymChain}
              currentGymAddress={user.gymAddress}
              currentGymVerified={user.gymVerified || false}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default GymVerificationPage;