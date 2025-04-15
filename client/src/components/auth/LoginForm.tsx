import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const LoginForm: FC = () => {
  const { loginMutation } = useAuth();
  
  // Create form with validation schema
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
        
        {/* Demo account login shortcuts */}
        <div className="mt-4">
          <p className="text-sm text-center text-gray-500 mb-2">Quick login with demo accounts:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.setValue("username", "johndoe");
                form.setValue("password", "password123");
                form.handleSubmit(onSubmit)();
              }}
              disabled={loginMutation.isPending}
            >
              John (Intermediate)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.setValue("username", "janedoe");
                form.setValue("password", "password123");
                form.handleSubmit(onSubmit)();
              }}
              disabled={loginMutation.isPending}
            >
              Jane (Advanced)
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
