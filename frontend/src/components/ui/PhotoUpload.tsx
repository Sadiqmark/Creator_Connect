import React, { useRef, useState } from 'react';
import { X, Loader2, Camera } from 'lucide-react';
import { AvatarWithFallback } from './AvatarWithFallback';

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  storagePath?: string; // Kept for backward compatibility with callers; preset determines asset folder
  label?: string;
  nameFallback?: string;
  aspectRatio?: 'square' | 'wide';
  required?: boolean;
  error?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  label = 'Profile Photo',
  nameFallback = 'Creator',
  required = false,
  error,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'xinpxb9h';
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'creator_connect_profile_images';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to upload image. Please try again.');
      }

      const secureUrl = data.secure_url;
      if (!secureUrl) {
        throw new Error('Upload succeeded but no secure URL was returned.');
      }

      onChange(secureUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setUploadError(null);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="photo-upload-input" className="block text-sm font-medium text-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      <div className="flex items-center gap-5">
        <div className="relative group">
          <AvatarWithFallback
            src={value}
            alt={nameFallback}
            size="2xl"
            className="border-2 border-border shadow-subtle"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              id="photo-upload-input"
              aria-label={label}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-semibold bg-surface border border-border hover:border-foreground-muted rounded-lg text-foreground flex items-center gap-1.5 shadow-subtle transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-accent" />
              {value ? 'Change Photo' : 'Upload Photo'}
            </button>

            {value && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemove}
                className="px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors flex items-center gap-1"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-foreground-muted">
            Recommended: 400x400 JPG, PNG or WEBP. Max 5MB.
          </p>
        </div>
      </div>

      {(uploadError || error) && (
        <p role="alert" className="text-xs text-danger font-medium">
          {uploadError || error}
        </p>
      )}
    </div>
  );
};
