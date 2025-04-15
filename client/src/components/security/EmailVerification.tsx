import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationProps {
  email: string;
  isVerified: boolean;
  onVerificationStatusChange: () => void;
}

export default function EmailVerification({ 
  email, 
  isVerified,
  onVerificationStatusChange
}: EmailVerificationProps) {
  const { toast } = useToast();

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resend-verification");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "A new verification email has been sent. Please check your inbox.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send verification email. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleResendVerification = () => {
    resendMutation.mutate();
  };

  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Email Verified
          </CardTitle>
          <CardDescription>
            Your email address has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{email}</span>
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Email Verification Required
        </CardTitle>
        <CardDescription>
          Please verify your email address to unlock all features of your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            We've sent a verification email to <strong>{email}</strong>. 
            Please check your inbox and click the verification link in the email.
          </AlertDescription>
        </Alert>
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{email}</span>
          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
            Unverified
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Didn't receive the email?
        </div>
        <Button
          variant="outline"
          onClick={handleResendVerification}
          disabled={resendMutation.isPending}
        >
          {resendMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>Resend Verification Email</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}