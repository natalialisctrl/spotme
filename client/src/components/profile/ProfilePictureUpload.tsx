import { FC, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Image, UploadCloud, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  userId: number;
  onImageUploaded: (imageUrl: string) => void;
}

const ProfilePictureUpload: FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  userId,
  onImageUploaded
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Reset states
    setError(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Create a preview
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    // Prepare for upload
    setIsUploading(true);

    try {
      // Convert to base64 for simple demonstration
      // In a production app, you'd use a form with multipart/form-data
      const base64 = await fileToBase64(file);
      
      // Update user profile with the picture (encoded as base64)
      // For a real app, you'd upload to a storage service and save the URL
      const response = await apiRequest('POST', `/api/users/${userId}/profile-picture`, {
        imageData: base64,
        fileName: file.name
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const { imageUrl } = await response.json();
      
      // Call the callback with the new image URL
      onImageUploaded(imageUrl);
      
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError('Failed to upload image. Please try again.');
      
      // Keep the preview for user experience, but show error
    } finally {
      setIsUploading(false);
    }
  }, [userId, onImageUploaded]);

  const removeImage = useCallback(() => {
    setImagePreview(null);
    onImageUploaded(''); // Clear the image URL
  }, [onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
  });

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="space-y-4">
      {imagePreview ? (
        <div className="relative">
          <img 
            src={imagePreview} 
            alt="Profile preview" 
            className="h-48 w-48 rounded-full object-cover mx-auto border-2 border-primary/20"
          />
          <Button 
            variant="destructive" 
            size="icon" 
            className="absolute top-0 right-0 rounded-full" 
            onClick={removeImage}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-10 w-10 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop your image here' : 'Drag & drop an image, or click to select'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG, GIF</p>
        </div>
      )}
      
      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading image...</span>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default ProfilePictureUpload;