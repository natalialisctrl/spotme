import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, ClipboardCopy, QrCode, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Verification code schema
const verificationSchema = z.object({
  verificationCode: z.string().length(6, "Code must be 6 digits")
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface MfaSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: ""
    }
  });

  useEffect(() => {
    // Fetch MFA setup data (QR code, secret, backup codes)
    async function fetchSetupData() {
      setIsLoading(true);
      try {
        const res = await apiRequest("GET", "/api/mfa/setup");
        
        if (!res.ok) {
          throw new Error("Failed to setup MFA");
        }
        
        const data = await res.json();
        setSetupData({
          qrCode: data.qrCode,
          secret: data.secret,
          backupCodes: data.backupCodes || []
        });
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to setup MFA",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSetupData();
  }, [toast]);

  // Form submission
  const onSubmit = async (data: VerificationFormValues) => {
    setIsVerifying(true);
    setError(null);
    
    try {
      const res = await apiRequest("POST", "/api/mfa/verify-setup", {
        verificationCode: data.verificationCode
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully set up for your account.",
      });
      
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      toast({
        title: "Verification Failed",
        description: err instanceof Error ? err.message : "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
      toast({
        title: "Secret Copied",
        description: "The secret key has been copied to your clipboard.",
      });
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      toast({
        title: "Backup Codes Copied",
        description: "Your backup codes have been copied to your clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center pt-6 pb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Setting up two-factor authentication...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Set Up Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Protect your account with an additional layer of security.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="qrcode">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
            <TabsTrigger value="manual">Manual Setup</TabsTrigger>
          </TabsList>
          <TabsContent value="qrcode" className="mt-4">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-2">
                Scan this QR code with your authenticator app.
              </p>
              {setupData?.qrCode && (
                <div className="p-4 bg-white rounded-md border">
                  <img 
                    src={setupData.qrCode} 
                    alt="MFA QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              <p className="text-xs text-center text-muted-foreground mt-2">
                Use an app like Google Authenticator, Authy, or Microsoft Authenticator.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="manual" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you can't scan the QR code, you can manually set up your authenticator app using this secret key:
              </p>
              <div className="flex items-center">
                <div className="flex-1 p-3 bg-muted rounded-l-md font-mono break-all text-sm">
                  {setupData?.secret}
                </div>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-l-none h-12" 
                  onClick={handleCopySecret}
                >
                  {secretCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Verify Setup</h3>
          <p className="text-sm text-muted-foreground">
            Enter the verification code from your authenticator app to complete the setup.
          </p>

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
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable MFA"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Backup Codes</h3>
          <p className="text-sm text-muted-foreground">
            Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator device.
          </p>

          <Alert>
            <AlertTitle className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Important
            </AlertTitle>
            <AlertDescription className="text-sm">
              Each backup code can only be used once. Keep them secure and accessible.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            {setupData?.backupCodes.map((code, index) => (
              <div key={index} className="p-2 bg-muted rounded-md font-mono text-sm">
                {code}
              </div>
            ))}
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleCopyBackupCodes}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copy All Backup Codes
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="ghost" 
          onClick={onCancel}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}