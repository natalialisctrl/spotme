import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
      <h1 className="text-4xl font-bold mb-4 text-primary">GymBuddy</h1>
      <h2 className="text-xl mb-8">Find your perfect workout partner</h2>
      
      <div className="p-8 bg-card shadow-lg rounded-lg w-full max-w-md space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">Debug Mode</h3>
          <p className="text-muted-foreground">Application is loading components correctly</p>
        </div>
        
        <div className="bg-accent/20 p-4 rounded-md">
          <p>Provider configuration successful</p>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
