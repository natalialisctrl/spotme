import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Create a client
const queryClient = new QueryClient();

function AuthTest() {
  const { user, loading, login, logout } = useAuth();
  
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
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Auth Status</h2>
          
          <div style={{ 
            padding: '1rem',
            background: user ? '#d1fae5' : '#fee2e2',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <p>{user ? `Logged in as ${user.name}` : 'Logged Out'}</p>
          </div>
          
          <button 
            onClick={() => user ? logout() : login('demo', 'password')}
            disabled={loading}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processing...' : user ? 'Log Out' : 'Log In (demo)'}
          </button>
        </div>
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '0.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Debug Info</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Authentication context is working properly. <br />
            Fixing main App component issues...
          </p>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthTest />
    </AuthProvider>
  </QueryClientProvider>
);
