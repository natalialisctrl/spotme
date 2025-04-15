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
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

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
        window.location.href = "/";
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
        window.location.href = "/";
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
      // First, completely remove any cached user data
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      // Then force a new fetch with no caching
      const userData = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (!userData.ok) {
        throw new Error(`Failed to fetch user data: ${userData.status}`);
      }
      
      // Get the fresh user data
      const freshUserData = await userData.json();
      
      // Manually update the query cache with the fresh data
      queryClient.setQueryData(["/api/user"], freshUserData);
      
      console.log("User data refreshed successfully with fresh data:", freshUserData.name);
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