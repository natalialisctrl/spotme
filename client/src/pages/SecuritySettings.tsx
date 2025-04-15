import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LockKeyhole, 
  Shield, 
  Mail, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import MfaSetup from "@/components/security/MfaSetup";
import EmailVerification from "@/components/security/EmailVerification";
import PasswordManagement from "@/components/security/PasswordManagement";

export default function SecuritySettings() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  // If not authenticated, redirect to login
  if (!isLoading && !user) {
    return <Redirect to="/auth" />;
  }

  // Get security log data
  const { data: securityLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/security/logs"],
    queryFn: getQueryFn(),
    enabled: !!user
  });

  // Mutation to disable MFA
  const disableMfaMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/mfa/disable", { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Two-Factor Authentication Disabled",
        description: "Your account is now using single-factor authentication.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Disable 2FA",
        description: error.message || "Could not disable two-factor authentication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDisableMfa = () => {
    // In a real app, you would prompt for the password first
    // Here we're simplifying for the demo
    const password = prompt("Enter your password to disable two-factor authentication:");
    if (password) {
      disableMfaMutation.mutate(password);
    }
  };

  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security settings and preferences.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        {/* General Security Settings */}
        <TabsContent value="general" className="space-y-6">
          {/* Two-Factor Authentication */}
          {showMfaSetup ? (
            <MfaSetup 
              onComplete={handleMfaSetupComplete} 
              onCancel={() => setShowMfaSetup(false)} 
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account by requiring a second 
                  authentication factor to sign in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border">
                      {user?.mfaEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {user?.mfaEnabled 
                          ? "Two-factor authentication is enabled" 
                          : "Two-factor authentication is not enabled"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user?.mfaEnabled 
                          ? "Your account is using two-factor authentication" 
                          : "Enable 2FA for enhanced account security"
                        }
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant={user?.mfaEnabled ? "outline" : "default"}
                    onClick={() => {
                      if (user?.mfaEnabled) {
                        handleDisableMfa();
                      } else {
                        setShowMfaSetup(true);
                      }
                    }}
                    disabled={disableMfaMutation.isPending}
                  >
                    {disableMfaMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      user?.mfaEnabled ? "Disable" : "Enable"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Email Verification */}
          <EmailVerification 
            email={user?.email || ""} 
            isVerified={user?.emailVerified || false}
            onVerificationStatusChange={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            }} 
          />
        </TabsContent>
        
        {/* Password Management */}
        <TabsContent value="password">
          <PasswordManagement />
        </TabsContent>
        
        {/* Security Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Security Activity
              </CardTitle>
              <CardDescription>
                Review recent security-related activity on your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : securityLogs && securityLogs.length > 0 ? (
                <div className="space-y-4">
                  {securityLogs.map((log, index) => (
                    <div key={index} className="flex items-start border-b pb-4 last:border-0">
                      <div className="mr-4 mt-1">
                        {log.eventType.includes("LOGIN") ? (
                          <LockKeyhole className="h-5 w-5 text-blue-500" />
                        ) : log.eventType.includes("FAIL") ? (
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : log.eventType.includes("PASSWORD") ? (
                          <KeyIcon className="h-5 w-5 text-purple-500" />
                        ) : log.eventType.includes("EMAIL") ? (
                          <Mail className="h-5 w-5 text-green-500" />
                        ) : (
                          <Shield className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{formatEventType(log.eventType)}</div>
                        <div className="text-sm text-muted-foreground">{log.details}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent security activity found
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/security/logs"] })}
              >
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to format security event types for display
function formatEventType(eventType: string): string {
  // Convert from UPPERCASE_WITH_UNDERSCORES to Regular Text with Spaces
  const formatted = eventType
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  
  return formatted;
}

// KeyIcon for password changes
function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}