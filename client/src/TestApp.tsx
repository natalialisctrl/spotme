import { useAuth } from "./context/AuthContext";

function TestApp() {
  const { user, loading } = useAuth();
  
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <p>Logged in as: {user.name}</p>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  );
}

export default TestApp;