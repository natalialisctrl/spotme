import { FC, useEffect } from 'react';
import { handleFacebookRedirect } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface RedirectHandlerProps {
  onSuccess?: (provider: string, userData: any) => void;
  onError?: (error: Error) => void;
}

const RedirectHandler: FC<RedirectHandlerProps> = ({ onSuccess, onError }) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await handleFacebookRedirect();
        if (result) {
          toast({
            title: "Success!",
            description: "Your Facebook account has been connected.",
          });
          
          if (onSuccess) {
            onSuccess('facebook', {
              id: result.user.uid,
              name: result.user.displayName,
              email: result.user.email,
              photoURL: result.user.photoURL,
            });
          }
        }
      } catch (error) {
        // Only show error toast if there's actually an error, not if there's just no redirect result
        if (error instanceof Error && error.message !== "No redirect result") {
          toast({
            title: "Authentication failed",
            description: "Could not connect to Facebook.",
            variant: "destructive",
          });
          
          if (onError && error instanceof Error) {
            onError(error);
          }
        }
      }
    };

    handleRedirectResult();
  }, [onSuccess, onError, toast]);

  // This component doesn't render anything
  return null;
};

export default RedirectHandler;