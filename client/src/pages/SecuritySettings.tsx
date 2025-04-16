import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Shield, Lock, KeyRound, Mail, AlertTriangle, 
  CheckCircle2, Clock, Phone, Check, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import MfaSetup from "@/components/security/MfaSetup";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export default function SecuritySettings() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  
  // Get user's security settings
  const { 
    data: securityData, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ["/api/security/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/security/settings");
      if (!res.ok) throw new Error("Failed to load security settings");
      return res.json();
    },
    enabled: !!user,
  });

  // Toggle MFA mutation
  const toggleMfaMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        setShowMfaSetup(true);
        return null; // Actual enabling happens in MfaSetup component
      } else {
        const res = await apiRequest("POST", "/api/mfa/disable");
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to disable MFA");
        }
        return await res.json();
      }
    },
    onSuccess: (data) => {
      if (data) { // Only for disabling MFA
        queryClient.invalidateQueries({ queryKey: ["/api/security/settings"] });
        toast({
          title: "MFA Disabled",
          description: "Two-factor authentication has been disabled for your account.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update MFA settings",
        variant: "destructive",
      });
    }
  });

  // Define log entry type
  interface SecurityLogEntry {
    timestamp: string;
    activity: string;
    ipAddress: string;
    status: 'success' | 'failed';
  }

  // Get security logs
  const { 
    data: logsData, 
    isLoading: logsLoading 
  } = useQuery<SecurityLogEntry[]>({
    queryKey: ["/api/security/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/security/logs");
      if (!res.ok) return []; // Return empty array if endpoint not implemented yet
      return res.json();
    },
    enabled: !!user,
  });

  const handleMfaComplete = () => {
    setShowMfaSetup(false);
    queryClient.invalidateQueries({ queryKey: ["/api/security/settings"] });
    toast({
      title: "MFA Enabled",
      description: "Two-factor authentication has been enabled for your account.",
    });
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Shield className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">Security Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Authentication section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Authentication
              </CardTitle>
              <CardDescription>
                Manage your account's authentication and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <>
                  {/* Email verification */}
                  <div className="flex justify-between items-center py-3 border-b">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
                      <div>
                        <h3 className="font-medium">Email Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Your email has been verified and is being used for account recovery
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {securityData?.emailVerified ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Two-factor authentication */}
                  <div className="flex justify-between items-center py-3 border-b">
                    <div className="flex items-start">
                      <KeyRound className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
                      <div>
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account with authenticator apps
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Switch 
                        checked={securityData?.mfaEnabled || false} 
                        onCheckedChange={(checked) => toggleMfaMutation.mutate(checked)}
                        disabled={toggleMfaMutation.isPending}
                      />
                    </div>
                  </div>

                  {/* Password management */}
                  <div className="flex justify-between items-center py-3 border-b">
                    <div className="flex items-start">
                      <KeyRound className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
                      <div>
                        <h3 className="font-medium">Password Management</h3>
                        <p className="text-sm text-muted-foreground">
                          Change your password or reset your password recovery options
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Password Management</DialogTitle>
                            <DialogDescription>
                              Update your password or recovery settings
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <PasswordManagement />
                          </div>
                          
                          <DialogFooter>
                            <Button variant="ghost">Close</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Phone verification (disabled for now) */}
                  <div className="flex justify-between items-center py-3 border-b opacity-50">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
                      <div>
                        <h3 className="font-medium">Phone Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Add your phone number for additional account recovery options
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                      >
                        Add Phone
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security logs section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Security Activity Logs
              </CardTitle>
              <CardDescription>
                Recent security-related activity on your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : logsData && logsData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.map((log: SecurityLogEntry, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.activity}</TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Success
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 text-sm">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Failed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-6">
                  No recent security activity to display
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security status section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
              <CardDescription>
                Your account's current security level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Security</span>
                    <span className={`text-sm font-medium ${securityData?.mfaEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                      {securityData?.mfaEnabled ? 'Strong' : 'Moderate'}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${securityData?.mfaEnabled ? 'bg-green-600 w-full' : 'bg-amber-500 w-2/3'}`}
                    ></div>
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded-full mr-2 ${securityData?.emailVerified ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {securityData?.emailVerified && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className="text-sm">Email verified</span>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded-full mr-2 ${securityData?.mfaEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {securityData?.mfaEnabled && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className="text-sm">Two-factor authentication</span>
                    </div>
                    
                    <div className="flex items-center">
                      <div className={`h-4 w-4 rounded-full mr-2 ${securityData?.strongPassword ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {securityData?.strongPassword && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className="text-sm">Strong password</span>
                    </div>
                  </div>
                  
                  {!securityData?.mfaEnabled && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Enhance Your Security</AlertTitle>
                      <AlertDescription>
                        We recommend enabling two-factor authentication to better protect your account.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Resources section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Security Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-sm">Security best practices</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-sm">Report security issue</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md">
                <div className="flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-gray-500" />
                  <span className="text-sm">Privacy settings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MFA Setup Dialog */}
      <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
        <DialogContent className="max-w-xl">
          <MfaSetup 
            onComplete={handleMfaComplete} 
            onCancel={() => setShowMfaSetup(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}