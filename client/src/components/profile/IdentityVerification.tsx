import { FC, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiFacebook } from "react-icons/si";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { signInWithGoogle, getCurrentUser } from '@/lib/firebase';
import { User } from '@shared/schema';

interface IdentityVerificationProps {
  user: User;
  onVerificationComplete: () => void;
}

const IdentityVerification: FC<IdentityVerificationProps> = ({ user, onVerificationComplete }) => {
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleGoogleVerification = async () => {
    try {
      setIsVerifying('google');
      setError(null);
      
      // Trigger Google sign-in
      const result = await signInWithGoogle();
      
      if (!result.user || !result.user.uid) {
        throw new Error('Failed to authenticate with Google');
      }
      
      // Link the account on our server
      const response = await apiRequest('POST', '/api/auth/social-link', {
        provider: 'google',
        firebaseUid: result.user.uid
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link Google account');
      }
      
      toast({
        title: "Account verified!",
        description: "Your Google account has been successfully linked.",
      });
      
      // Refresh user data
      onVerificationComplete();
    } catch (err: any) {
      console.error("Google verification error:", err);
      
      let errorMessage = 'Failed to verify with Google';
      
      // Handle specific Firebase errors
      if (err?.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase OAuth needs to be configured in the Firebase console. Please add authorized domains in Firebase Authentication settings.';
      } else if (err?.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by your browser. Please enable popups for this site.';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Authentication was cancelled. Please try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(null);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          Verify your identity with external accounts to build trust with potential gym partners
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center gap-3">
            <FcGoogle className="h-5 w-5" />
            <div>
              <p className="font-medium">Google</p>
              <p className="text-xs text-muted-foreground">Verify with your Google account</p>
            </div>
          </div>
          
          {user.googleVerified ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGoogleVerification}
              disabled={isVerifying === 'google'}
            >
              {isVerifying === 'google' ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center gap-3">
            <SiFacebook className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium">Facebook</p>
              <p className="text-xs text-muted-foreground">Verify with your Facebook account</p>
            </div>
          </div>
          
          {user.facebookVerified ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              disabled={true}
            >
              Coming Soon
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Note: We never post to your accounts. Verification only confirms your identity.
        </p>
      </CardContent>
    </Card>
  );
};

export default IdentityVerification;