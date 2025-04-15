import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Verification code schema
const verificationSchema = z.object({
  verificationCode: z.string().min(6, "Code must be 6 digits").max(6)
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface MfaVerificationProps {
  userId: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function MfaVerification({ userId, onSuccess, onCancel }: MfaVerificationProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: ""
    }
  });

  // Form submission
  const onSubmit = async (data: VerificationFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const res = await apiRequest("POST", "/api/mfa/verify", {
        userId,
        verificationCode: data.verificationCode
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      
      toast({
        title: "Verification Successful",
        description: "You have successfully verified your identity.",
      });
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      toast({
        title: "Verification Failed",
        description: err instanceof Error ? err.message : "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backup code
  const handleUseBackupCode = async () => {
    try {
      const res = await apiRequest("GET", `/api/mfa/backup/${userId}`);
      
      if (!res.ok) {
        throw new Error("Could not switch to backup code verification");
      }
      
      // Redirect to backup code verification
      window.location.href = `/auth/backup-code?userId=${userId}`;
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not switch to backup code verification",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="verificationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-red-500 mt-2">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center">
          <Button 
            variant="link" 
            className="text-sm text-muted-foreground" 
            onClick={handleUseBackupCode}
          >
            Use backup code instead
          </Button>
        </div>
      </CardContent>
      {onCancel && (
        <CardFooter>
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}