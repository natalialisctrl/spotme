import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPinIcon, BuildingIcon, CheckCircleIcon, LockIcon } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gymChains } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const gymVerificationSchema = z.object({
  gymChain: z.string().min(1, "Please select your gym"),
  gymName: z.string().optional(),
  gymAddress: z.string().min(5, "Please enter a valid address").optional(),
  gymMemberId: z.string().optional(),
  gymEmail: z.string().email("Please provide a valid email").optional(),
  gymPassword: z.string().min(1, "Password is required").optional(),
});

type GymVerificationFormValues = z.infer<typeof gymVerificationSchema>;

interface GymVerificationProps {
  userId: number;
  currentGymName: string | null;
  currentGymChain: string | null;
  currentGymAddress: string | null;
  currentGymVerified: boolean;
  onSuccess?: () => void;
}

export function GymVerification({
  userId,
  currentGymName,
  currentGymChain,
  currentGymAddress,
  currentGymVerified,
  onSuccess,
}: GymVerificationProps) {
  const [selectedGymChain, setSelectedGymChain] = useState<string>(currentGymChain || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up form with default values from user profile
  const form = useForm<GymVerificationFormValues>({
    resolver: zodResolver(gymVerificationSchema),
    defaultValues: {
      gymChain: currentGymChain || "",
      gymName: currentGymName || "",
      gymAddress: currentGymAddress || "",
      gymMemberId: "",
      gymEmail: "",
      gymPassword: "",
    },
  });

  // Handle gym verification API call
  const verifyGymMutation = useMutation({
    mutationFn: async (data: GymVerificationFormValues) => {
      const res = await apiRequest("POST", "/api/users/verify-gym", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gym information saved",
        description: "Your gym information has been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving gym information",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: GymVerificationFormValues) => {
    // If "Other" is selected, make sure a custom gym name is provided
    if (data.gymChain === "Other" && !data.gymName) {
      form.setError("gymName", {
        type: "manual",
        message: "Please provide your gym name",
      });
      return;
    }

    // Submit data to the API
    verifyGymMutation.mutate(data);
  };

  // Update which fields are required based on the selected gym chain
  const handleGymChainChange = (value: string) => {
    setSelectedGymChain(value);
    form.setValue("gymChain", value);
    
    // Clear other fields when changing gym chain
    if (value === "Other") {
      form.setValue("gymMemberId", "");
      form.setValue("gymEmail", "");
      form.setValue("gymPassword", "");
    } else {
      // Keep the custom gym name when switching to a known chain
      form.setValue("gymName", "");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BuildingIcon className="mr-2 h-5 w-5" />
          Gym Verification
        </CardTitle>
        <CardDescription>
          Connect your gym membership to verify your gym location and find workout partners at the same gym.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentGymVerified ? (
          <div className="flex items-center p-4 bg-green-50 rounded-md">
            <CheckCircleIcon className="text-green-500 h-5 w-5 mr-2" />
            <div>
              <p className="font-medium">Gym Verified</p>
              <p className="text-sm text-muted-foreground">
                {currentGymName} ({currentGymAddress})
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="gymChain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select your gym</FormLabel>
                    <Select
                      onValueChange={(value) => handleGymChainChange(value)}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gym" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gymChains.map((chain) => (
                          <SelectItem key={chain} value={chain}>
                            {chain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedGymChain === "Other" && (
                <>
                  <FormField
                    control={form.control}
                    name="gymName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your gym name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gymAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your gym address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedGymChain && selectedGymChain !== "Other" && (
                <>
                  <div className="bg-blue-50 p-4 rounded-md mb-4">
                    <h4 className="text-sm font-medium flex items-center mb-2">
                      <LockIcon className="h-4 w-4 mr-1" />
                      Sign in to your {selectedGymChain} account
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Your credentials are only used to verify your gym membership and will not be stored.
                    </p>

                    <FormField
                      control={form.control}
                      name="gymMemberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Your membership number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gymEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Email used for your gym account" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gymPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Your gym account password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="gymAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gym Location <span className="text-xs text-muted-foreground">(Which branch do you visit?)</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter the address of the location you visit" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyGymMutation.isPending}
              >
                {verifyGymMutation.isPending ? "Saving..." : "Save Gym Information"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      
      {currentGymVerified && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              // Allow re-verification
              onSuccess?.();
            }}
            className="w-full"
          >
            Update Gym Information
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}