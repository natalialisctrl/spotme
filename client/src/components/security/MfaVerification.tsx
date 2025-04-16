import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface MfaVerificationProps {
  userId: number;
  onComplete: (userData: any) => void;
  onCancel: () => void;
}

export default function MfaVerification({ 
  userId, 
  onComplete, 
  onCancel 
}: MfaVerificationProps) {
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [backupCode, setBackupCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Verify with authenticator app
  const handleVerifyWithApp = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    
    await verifyCode("totp", verificationCode);
  };
  
  // Verify with backup code
  const handleVerifyWithBackup = async () => {
    if (!backupCode.trim() || backupCode.length < 8) {
      setError("Please enter a valid backup code");
      return;
    }
    
    await verifyCode("backup", backupCode);
  };
  
  // Verify code with the API
  const verifyCode = async (type: "totp" | "backup", code: string) => {
    setIsSubmitting(true);
    setError("");
    
    try {
      const res = await apiRequest("POST", "/api/mfa/login-verify", {
        userId,
        type,
        code,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid verification code");
      }
      
      const userData = await res.json();
      onComplete(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Two-Factor Authentication</DialogTitle>
        <DialogDescription>
          Verify your identity using your authentication app or a backup code
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}
        
        <Tabs defaultValue="authenticator">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="authenticator">Authenticator App</TabsTrigger>
            <TabsTrigger value="backup">Backup Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="authenticator" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="totp-code">Enter the 6-digit code from your authenticator app</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-2 text-center text-lg tracking-widest font-mono"
              />
            </div>
            
            <Button 
              onClick={handleVerifyWithApp} 
              className="w-full"
              disabled={isSubmitting || verificationCode.length !== 6}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : "Verify"}
            </Button>
          </TabsContent>
          
          <TabsContent value="backup" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="backup-code">Enter one of your backup codes</Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="xxxxx-xxxxx"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="mt-2 text-center text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use one of the backup codes you saved when setting up two-factor authentication.
                Each code can only be used once.
              </p>
            </div>
            
            <Button 
              onClick={handleVerifyWithBackup} 
              className="w-full"
              disabled={isSubmitting || backupCode.length < 8}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : "Verify with Backup Code"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  );
}