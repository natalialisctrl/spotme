import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Verification code schema
const verificationSchema = z.object({
  verificationCode: z.string().min(6, "Code must be 6 digits").max(6)
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface MfaSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function MfaSetup({ onComplete, onCancel }: MfaSetupProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("setup");
  const [copied, setCopied] = useState<boolean>(false);

  // Setup form
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: ""
    }
  });

  // Initialize MFA setup
  const initSetupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/setup/init");
      return res.json();
    },
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Could not initialize MFA setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Verify code to complete setup
  const verifyMutation = useMutation({
    mutationFn: async (data: VerificationFormValues) => {
      const res = await apiRequest("POST", "/api/mfa/setup/verify", {
        verificationCode: data.verificationCode
      });
      return res.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setActiveTab("backup");
      toast({
        title: "Verification Successful",
        description: "Your verification code is correct. Please save your backup codes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete MFA setup
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mfa/setup/complete");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "MFA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Could not complete MFA setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start setup on mount
  useEffect(() => {
    initSetupMutation.mutate();
  }, []);

  // Form submission
  const onSubmit = (data: VerificationFormValues) => {
    verifyMutation.mutate(data);
  };

  // Copy secret to clipboard
  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Secret copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard.",
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Setup Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Secure your account with an extra layer of protection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" disabled={activeTab === "backup"}>
              Setup
            </TabsTrigger>
            <TabsTrigger value="backup" disabled={activeTab === "setup"}>
              Backup Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            {initSetupMutation.isPending ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Alert className="mb-4">
                  <AlertTitle>Important Instructions</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Scan this QR code with an authenticator app like Google Authenticator,
                      Microsoft Authenticator, or Authy.
                    </p>
                    <p>
                      Then enter the 6-digit verification code shown in your app to complete setup.
                    </p>
                  </AlertDescription>
                </Alert>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="border border-border rounded p-2 bg-white">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-mono p-1 bg-muted rounded">{secret}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={copySecret}
                        title="Copy secret key"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      If you can't scan the QR code, you can manually enter this secret key in your app.
                    </p>
                  </div>
                )}

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
                              placeholder="Enter the 6-digit code"
                              maxLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Continue"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Save Your Backup Codes</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  If you lose your device, you'll need these backup codes to access your account.
                </p>
                <p className="font-bold">
                  Save these codes in a safe place. They won't be shown again!
                </p>
              </AlertDescription>
            </Alert>

            <div className="border rounded-md p-4 font-mono text-sm space-y-1 bg-muted/30">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex justify-between">
                  <span>{code}</span>
                  <span className="text-muted-foreground">{index + 1}/{backupCodes.length}</span>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={copyBackupCodes}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Backup Codes
            </Button>

            <Button 
              className="w-full" 
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {activeTab === "setup" && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}