import { createContext, useContext, useState, ReactNode } from "react";

// Create a mock user type
interface MockUser {
  id: number;
  name: string;
  username: string;
  email: string;
}

// Define the auth context type
interface AuthContextType {
  user: MockUser | null;
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
const mockUser: MockUser = {
  id: 1,
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com"
};

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
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
    
    // Simulate API call
    setTimeout(() => {
      // For testing - automatically log in
      setUser(mockUser);
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
