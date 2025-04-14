import { createRoot } from "react-dom/client";
import "./index.css";

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
        <p style={{ textAlign: 'center' }}>
          Testing basic React rendering
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<BasicApp />);
