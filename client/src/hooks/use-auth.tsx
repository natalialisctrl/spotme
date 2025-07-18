import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, Login } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, Login>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, any>;
  refreshUserData: () => Promise<void>;
  attemptAutoLogin: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Auto-login functionality has been disabled per user request
  const attemptAutoLogin = async () => {
    console.log("Auto-login is disabled");
    return false;
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: Login) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a refetch of user data to ensure everything is up-to-date
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      
      // Add a small delay to ensure the user state is updated before redirecting
      setTimeout(() => {
        // Check if user needs to complete profile setup
        if (!user.aiGeneratedInsights) {
          window.location.href = "/profile-setup";
        } else {
          window.location.href = "/";
        }
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a refetch of user data to ensure everything is up-to-date
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
      
      // Add a small delay to ensure the user state is updated before redirecting
      setTimeout(() => {
        // For new users, always redirect to profile setup
        window.location.href = "/profile-setup";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshUserData = async () => {
    console.log("Refreshing user data...");
    try {
      // SOLUTION 1: Completely remove all queries from cache
      queryClient.clear();
      
      // SOLUTION 2: Force browser to bypass its own cache
      const timestamp = new Date().getTime();
      
      // SOLUTION 3: Use direct fetch with all cache prevention headers
      const userData = await fetch(`/api/user?nocache=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': '0',
          'If-None-Match': ''
        },
        credentials: 'include'
      });
      
      if (!userData.ok) {
        throw new Error(`Failed to fetch user data: ${userData.status}`);
      }
      
      // SOLUTION 4: Parse server response as fresh data
      const freshUserData = await userData.json();
      
      // SOLUTION 5: Completely rebuild the query cache with fresh data
      queryClient.setQueryData(["/api/user"], freshUserData);
      
      // SOLUTION 6: Force a reset of the entire query cache
      queryClient.resetQueries({ queryKey: ["/api/user"] });
      
      console.log("User data refreshed successfully with fresh data:", freshUserData.name);
      
      // Force a small delay to ensure React has time to process the state change
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return freshUserData;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast({
        title: "Error refreshing data",
        description: "Failed to refresh your profile data. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshUserData,
        attemptAutoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}