import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MfaVerificationProps {
  userId: number;
  username: string;
  onComplete: (userData: any) => void;
  onCancel: () => void;
}

export default function MfaVerification({ userId, username, onComplete, onCancel }: MfaVerificationProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/verify", {
        userId,
        mfaCode: code
      });
      return res.json();
    },
    onSuccess: (userData) => {
      toast({
        title: "Verification Successful",
        description: "You have successfully logged in.",
      });
      onComplete(userData);
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (!code) {
      toast({
        title: "Required Field",
        description: "Please enter a verification code.",
        variant: "destructive",
      });
      return;
    }

    // For normal MFA codes, ensure it's 6 digits
    if (!isUsingBackupCode && (code.length !== 6 || !/^\d+$/.test(code))) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Verification
        </CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app to complete sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} disabled />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="code">
              {isUsingBackupCode ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="code"
              placeholder={isUsingBackupCode ? "Enter backup code" : "Enter 6-digit code"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={isUsingBackupCode ? undefined : 6}
            />
          </div>
          <Button
            variant="link"
            className="p-0 h-auto text-sm"
            onClick={() => {
              setIsUsingBackupCode(!isUsingBackupCode);
              setCode("");
            }}
          >
            {isUsingBackupCode
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
          {verifyMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>Verify</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}