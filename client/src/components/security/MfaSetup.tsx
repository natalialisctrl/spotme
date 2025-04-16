import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface MfaSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "backup">("loading");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  
  // Load setup data
  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const res = await apiRequest("GET", "/api/mfa/setup");
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to load MFA setup data");
        }
        
        const data = await res.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setStep("setup");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load MFA setup");
        setStep("setup"); // Move to setup anyway to show error
      }
    };
    
    fetchSetupData();
  }, []);
  
  // Verify the code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const res = await apiRequest("POST", "/api/mfa/verify", {
        code: verificationCode,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid verification code");
      }
      
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Complete setup
  const handleComplete = async () => {
    try {
      // Final confirmation
      const res = await apiRequest("POST", "/api/mfa/enable");
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to enable MFA");
      }
      
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete MFA setup");
    }
  };
  
  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setShowBackupCodes(true);
  };
  
  // Regenerate backup codes
  const regenerateBackupCodes = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/mfa/regenerate-backup-codes");
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to regenerate backup codes");
      }
      
      const data = await res.json();
      setBackupCodes(data.backupCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate backup codes");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === "loading" && "Setting up Two-Factor Authentication"}
          {step === "setup" && "Set up Two-Factor Authentication"}
          {step === "verify" && "Verify Authentication App"}
          {step === "backup" && "Save Your Backup Codes"}
        </DialogTitle>
        <DialogDescription>
          {step === "loading" && "Preparing your two-factor authentication setup..."}
          {step === "setup" && "Scan the QR code with your authentication app (Google Authenticator, Authy, etc.)"}
          {step === "verify" && "Enter the 6-digit code from your authentication app to verify setup"}
          {step === "backup" && "Save these codes in a secure place. They can be used to access your account if you lose your device."}
        </DialogDescription>
      </DialogHeader>

      <div className="py-6">
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Loading setup data...</p>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center">
              {qrCode ? (
                <div className="bg-white p-4 rounded-md shadow-sm border">
                  <img 
                    src={`data:image/png;base64,${qrCode}`} 
                    alt="QR Code for 2FA setup" 
                    width={200} 
                    height={200} 
                  />
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md w-[200px] h-[200px] flex items-center justify-center border">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            {secret && (
              <div className="space-y-2">
                <Label>Manual Entry Code:</Label>
                <div className="flex gap-2">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="font-mono tracking-widest text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  If you can't scan the QR code, enter this code manually in your authenticator app.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => setStep("verify")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <div>
              <Label htmlFor="verification-code">Enter Verification Code:</Label>
              <div className="mt-2">
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="000000"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Open your authentication app and enter the 6-digit code displayed for this account.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep("setup")}>
                Back
              </Button>
              <Button 
                onClick={handleVerifyCode} 
                disabled={isSubmitting || verificationCode.length !== 6}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : "Verify Code"}
              </Button>
            </div>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Your Backup Codes</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={regenerateBackupCodes}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
              
              <div className="border rounded-md p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="font-mono text-sm bg-white py-1 px-2 rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={copyBackupCodes}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy all codes
              </Button>
              
              {showBackupCodes && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Backup codes copied to clipboard
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-4">
                <strong>Important:</strong> Each code can only be used once. Store these somewhere safe and accessible, like a password manager.
                You'll need these codes if you lose access to your authentication app.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep("verify")}>
                Back
              </Button>
              <Button onClick={handleComplete}>
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}