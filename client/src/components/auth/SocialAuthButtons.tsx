import { FC, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { SiFacebook } from "react-icons/si";
import { Loader2 } from "lucide-react";
import { signInWithGoogle, signInWithFacebook } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface SocialAuthButtonsProps {
  onSuccess?: (provider: string, userData: any) => void;
  onError?: (error: Error) => void;
}

const SocialAuthButtons: FC<SocialAuthButtonsProps> = ({ onSuccess, onError }) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      toast({
        title: "Success!",
        description: "Your Google account has been connected.",
      });
      
      if (onSuccess) {
        onSuccess('google', {
          id: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        });
      }
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: "Could not connect to Google.",
        variant: "destructive",
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsFacebookLoading(true);
    try {
      await signInWithFacebook();
      // The result will be handled in the redirect result handler
      // Toast will be shown there
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: "Could not connect to Facebook.",
        variant: "destructive",
      });
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      setIsFacebookLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FcGoogle className="mr-2 h-5 w-5" />
        )}
        {isGoogleLoading ? "Connecting..." : "Connect with Google"}
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleFacebookSignIn}
        disabled={isFacebookLoading}
      >
        {isFacebookLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <SiFacebook className="mr-2 h-5 w-5 text-blue-600" />
        )}
        {isFacebookLoading ? "Connecting..." : "Connect with Facebook"}
      </Button>
    </div>
  );
};

export default SocialAuthButtons;