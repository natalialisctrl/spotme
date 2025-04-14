import { createContext, useContext, useState, ReactNode } from "react";

// Define a simple auth context type
type SimpleAuthContextType = {
  isLoggedIn: boolean;
  setLoggedIn: (value: boolean) => void;
};

// Create the context with a default value
const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// Create a provider component
export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setLoggedIn] = useState(false);
  
  const value = {
    isLoggedIn,
    setLoggedIn
  };
  
  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

// Create a hook to use the auth context
export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  
  if (context === undefined) {
    throw new Error("useSimpleAuth must be used within a SimpleAuthProvider");
  }
  
  return context;
}