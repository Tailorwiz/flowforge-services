import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  size = 'md',
  showUploadButton = true 
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-32 h-32'
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      onAvatarUpdate(avatarUrl);
      
      // Force a slight delay to ensure the image loads properly
      setTimeout(() => {
        toast({
          title: "Success",
          description: "Avatar updated successfully!",
        });
      }, 500);

    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      {/* Avatar Display */}
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-rdr-light-gray border-4 border-rdr-gold/20 flex items-center justify-center relative shadow-lg`}>
        {currentAvatarUrl ? (
          <img 
            src={`${currentAvatarUrl}?t=${Date.now()}`}
            alt="Avatar" 
            className="w-full h-full object-cover object-top"
            style={{ objectPosition: '50% 20%' }}
            onError={(e) => {
              console.error('Image failed to load:', currentAvatarUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-rdr-navy text-white flex items-center justify-center">
            <span className="font-bold text-2xl">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Upload Overlay */}
        {showUploadButton && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
            <div className="text-white text-center">
              <Camera className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-medium">Upload</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Input */}
      {showUploadButton && (
        <input
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      )}
    </div>
  );
};

export default AvatarUpload;