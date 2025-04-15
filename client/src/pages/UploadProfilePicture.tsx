import React, { useState } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const UploadProfilePicture: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    
    setIsUploading(true);
    
    try {
      // Create base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });
      
      // Send to server
      const response = await apiRequest('POST', `/api/users/${user.id}/profile-picture`, {
        imageData: base64,
        fileName: selectedFile.name
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      toast({
        title: "Profile picture uploaded!",
        description: "Your profile picture has been updated successfully.",
      });
      
      // Navigate back to profile
      navigate("/profile");
      
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="container py-8 max-w-md">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate("/profile")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Upload Profile Picture</CardTitle>
          <CardDescription className="text-center">
            Choose a photo to use as your profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview Section */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border-2 border-primary">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-12 h-12 text-gray-400" />
              )}
            </div>
          </div>
          
          {/* File Input Button */}
          <div className="text-center">
            <input
              type="file"
              id="profile-picture-input"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('profile-picture-input')?.click()}
              className="w-full h-20 border-dashed border-2"
            >
              <div className="flex flex-col items-center">
                <Camera className="mb-2 h-6 w-6" />
                <span>Select Image</span>
              </div>
            </Button>
            
            {selectedFile && (
              <p className="text-sm text-gray-500 mt-2">
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="ghost"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Picture'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UploadProfilePicture;