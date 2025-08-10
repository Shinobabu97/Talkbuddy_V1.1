import React, { useState } from 'react';
import { X, Upload, User, Loader2, Camera } from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  currentPictureUrl?: string;
  onPictureUpdate: (newUrl: string | null) => void;
}

export default function ProfilePictureModal({ 
  isOpen, 
  onClose, 
  user, 
  currentPictureUrl, 
  onPictureUpdate 
}: ProfilePictureModalProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPictureUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const deleteOldProfilePicture = async (oldUrl: string | null) => {
    if (!oldUrl) return;
    
    try {
      // Extract the file path from the URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/profile-pictures/user_id/filename.ext
      const url = new URL(oldUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('profile-pictures');
      
      if (bucketIndex === -1) {
        console.error('Invalid profile picture URL format');
        return;
      }
      
      // Get the path after 'profile-pictures/'
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);
        
      if (error) {
        console.error('Error deleting old profile picture:', error);
      }
    } catch (error) {
      console.error('Error deleting old profile picture:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      onClose();
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload new file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Delete old profile picture after successful upload
      if (currentPictureUrl) {
        await deleteOldProfilePicture(currentPictureUrl);
      }

      // Update user profile in database
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile_picture_url: publicUrl,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // Update parent component
      onPictureUpdate(publicUrl);
      onClose();

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const err = error as Error;
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentPictureUrl) return;

    setUploading(true);
    setError(null);

    try {
      // Delete from storage
      await deleteOldProfilePicture(currentPictureUrl);

      // Update database
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile_picture_url: null,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // Update parent component
      onPictureUpdate(null);
      onClose();

    } catch (error) {
      console.error('Error removing profile picture:', error);
      const err = error as Error;
      setError(err.message || 'Failed to remove image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (selectedFile && previewUrl && previewUrl !== currentPictureUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(currentPictureUrl || null);
    setSelectedFile(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900/40 to-orange-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="modal-glass rounded-xl max-w-md w-full p-6 relative shadow-glass-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-glass">
            Profile Picture
          </h2>
          <p className="text-gray-700">
            Upload or change your profile picture
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg glass text-red-800 border border-red-300/50">
            {error}
          </div>
        )}

        {/* Current/Preview Image */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Profile preview" 
                className="w-32 h-32 rounded-full object-cover border-4 border-white/50 shadow-glass"
              />
            ) : (
              <div className="w-32 h-32 glass rounded-full flex items-center justify-center border-4 border-white/50">
                <User className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 w-8 h-8 btn-glossy rounded-full flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-6">
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="w-full py-3 px-4 glass hover:glass-strong rounded-lg cursor-pointer transition-all duration-300 text-center border-2 border-dashed border-gray-300 hover:border-orange-400">
              <Upload className="h-6 w-6 mx-auto mb-2 text-gray-600" />
              <span className="text-gray-700 font-medium">
                {selectedFile ? selectedFile.name : 'Choose new photo'}
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {currentPictureUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1 py-2 px-4 glass hover:glass-strong text-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
            >
              Remove Photo
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 py-2 px-4 btn-glossy text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              selectedFile ? 'Save Photo' : 'Close'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}