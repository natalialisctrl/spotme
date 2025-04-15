import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MfaSetupProps = {
  onComplete: () => void;
  onCancel: () => void;
};

export default function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  // Setup MFA - Get QR code and backup codes
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/setup");
      return await res.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep("verify");
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Could not setup MFA. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enable MFA - Verify the code and complete setup
  const enableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/enable", {
        mfaCode: verificationCode
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled for your account.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }
    enableMutation.mutate();
  };

  if (step === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Setup Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by enabling two-factor authentication (2FA).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Why use two-factor authentication?</h3>
              <p className="text-sm text-muted-foreground">
                With 2FA, you'll need both your password and a verification code from your
                authenticator app to sign in. This protects your account even if your password
                is compromised.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">You'll need an authenticator app</h3>
              <p className="text-sm text-muted-foreground">
                Download an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
                before continuing.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSetup} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>Continue</>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Complete Two-Factor Setup
        </CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app and enter the verification code to enable 2FA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="qrcode">
          <TabsList className="mb-4">
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="backup">Backup Codes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qrcode" className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code for Authenticator App" className="w-48 h-48" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with your authenticator app
            </p>
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            {secret && (
              <div className="space-y-2">
                <Label htmlFor="secret">Secret Key</Label>
                <div className="flex">
                  <Input 
                    id="secret" 
                    value={secret} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    className="ml-2"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      toast({
                        title: "Copied",
                        description: "Secret key copied to clipboard",
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you can't scan the QR code, you can manually enter this secret key into your authenticator app.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="backup" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Save these backup codes in a secure place. You'll need them if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>
            
            {backupCodes && (
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="font-mono text-xs p-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                if (backupCodes) {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  toast({
                    title: "Copied",
                    description: "Backup codes copied to clipboard",
                  });
                }
              }}
            >
              Copy All Codes
            </Button>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from your authenticator app to verify and complete the setup.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleVerify} disabled={enableMutation.isPending}>
          {enableMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>Enable Two-Factor Authentication</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}