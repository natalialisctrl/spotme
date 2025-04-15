import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Dumbbell } from "lucide-react";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Create a client
const queryClient = new QueryClient();

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Simpler login form component that doesn't use Auth context
function LoginForm({ onLogin, loading }: { onLogin: (username: string, password: string) => void, loading: boolean }) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });
  
  const onSubmit = (values: LoginFormValues) => {
    onLogin(values.username, values.password);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Dumbbell className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Welcome to GymBuddy</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            
            <p className="text-center text-sm text-gray-500">
              Demo credentials: username "demo" and password "password"
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AuthDemo() {
  const { user, loading, login, logout } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  if (!user && showLoginForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <LoginForm 
            onLogin={(username, password) => login(username, password)} 
            loading={loading} 
          />
          <div className="text-center mt-4">
            <Button 
              variant="link" 
              onClick={() => setShowLoginForm(false)}
            >
              Back to Quick Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">
          GymBuddy App
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Current user status and login controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-md mb-4 ${user ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {user ? `Logged in as ${user.name}` : 'Logged Out'}
            </div>
            
            <div className="flex flex-col space-y-4">
              <Button 
                onClick={() => user ? logout() : login('demo', 'password')}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  user ? 'Log Out' : 'Quick Login (demo)'
                )}
              </Button>
              
              {!user && (
                <Button 
                  onClick={() => setShowLoginForm(true)}
                  variant="outline"
                  className="w-full"
                >
                  Show Custom Login Form
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  </QueryClientProvider>
);
