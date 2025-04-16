import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationProps {
  email: string;
  onComplete: () => void;
}

export default function EmailVerification({ email, onComplete }: EmailVerificationProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  
  // Request verification email
  const requestVerificationEmail = async () => {
    setIsSending(true);
    setError("");
    
    try {
      const res = await apiRequest("POST", "/api/email/request-verification");
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send verification email");
      }
      
      toast({
        title: "Verification Email Sent",
        description: `We've sent a verification code to ${email}. Please check your inbox and spam folder.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification email");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send verification email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Verify email code
  const verifyEmail = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const res = await apiRequest("POST", "/api/email/verify", {
        code: verificationCode,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Invalid verification code");
      }
      
      setIsVerified(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify email");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="font-medium text-lg mb-2">Email Verified!</h3>
        <p className="text-muted-foreground">
          Your email has been successfully verified. You'll be redirected in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <div className="text-center py-4">
        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="font-medium text-lg mb-2">Verify Your Email</h3>
        <p className="text-muted-foreground">
          We need to verify that {email} belongs to you. 
          Click the button below to receive a verification code.
        </p>
      </div>
      
      <Button 
        className="w-full"
        onClick={requestVerificationEmail}
        disabled={isSending}
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : "Send Verification Code"}
      </Button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Enter Code
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Verification code"
            className="text-center text-lg tracking-wider"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Enter the 6-digit code sent to your email
          </p>
        </div>
        
        <Button 
          className="w-full"
          onClick={verifyEmail}
          disabled={isSubmitting || !verificationCode.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : "Verify Email"}
        </Button>
      </div>
    </div>
  );
}