import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimpleAuthProvider, useSimpleAuth } from "./context/SimpleAuthContext";

// Create a client
const queryClient = new QueryClient();

function AuthTest() {
  const { isLoggedIn, setLoggedIn } = useSimpleAuth();
  
  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <div style={{ 
        padding: '1rem',
        background: isLoggedIn ? '#d1fae5' : '#fee2e2',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <p>Auth Status: {isLoggedIn ? 'Logged In' : 'Logged Out'}</p>
      </div>
      
      <button 
        onClick={() => setLoggedIn(!isLoggedIn)}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem',
          cursor: 'pointer'
        }}
      >
        {isLoggedIn ? 'Log Out' : 'Log In'}
      </button>
    </div>
  );
}

function BasicApp() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f0f4f8'
    }}>
      <h1 style={{ 
        fontSize: '2rem', 
        color: '#3b82f6', 
        marginBottom: '1rem' 
      }}>
        GymBuddy App
      </h1>
      <div style={{ 
        padding: '2rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Testing with Auth Provider
        </p>
        
        <AuthTest />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SimpleAuthProvider>
      <BasicApp />
    </SimpleAuthProvider>
  </QueryClientProvider>
);
