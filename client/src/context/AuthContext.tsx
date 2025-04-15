import { createContext, useContext, useState, ReactNode } from "react";
import { User } from "@shared/schema";

// Define the auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => void;
  register: (userData: any) => void;
  logout: () => void;
  checkAuth: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create mock user data
const mockUser: User = {
  id: 1,
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  gender: "male",
  experienceLevel: "intermediate",
  experienceYears: 3,
  password: "password", // Don't worry, this is just mock data
  bio: "Fitness enthusiast looking for gym partners",
  gymName: "FitZone Gym",
  latitude: null,
  longitude: null,
  lastActive: new Date(),
  aiGeneratedInsights: null,
  firebaseUid: null,
  googleVerified: false,
  facebookVerified: false,
  instagramVerified: false
};

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Explicitly setting initial state to null to prevent auto-login
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified auth functions
  const login = (username: string, password: string) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      if (username === "demo" && password === "password") {
        setUser(mockUser);
        setError(null);
      } else {
        setUser(null);
        setError("Invalid credentials");
      }
      setLoading(false);
    }, 500);
  };

  const register = (userData: any) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setUser(mockUser);
      setError(null);
      setLoading(false);
    }, 500);
  };

  const logout = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setUser(null);
      setLoading(false);
    }, 500);
  };

  const checkAuth = () => {
    setLoading(true);
    
    // Simulate API call checking if user is logged in
    setTimeout(() => {
      // Don't auto-login the user anymore
      setLoading(false);
    }, 500);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Create the auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}
