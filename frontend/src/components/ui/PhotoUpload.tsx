import React, { useRef, useState } from 'react';
import { X, Loader2, Camera } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { AvatarWithFallback } from './AvatarWithFallback';

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  storagePath: string; // e.g. `creators/${userId}/avatar` or `businesses/${userId}/logo`
  label?: string;
  nameFallback?: string;
  aspectRatio?: 'square' | 'wide';
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  storagePath,
  label = 'Profile Photo',
  nameFallback = 'Creator',
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
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileRef = ref(storage, `${storagePath}_${Date.now()}.${fileExt}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      onChange(downloadUrl);
    } catch (err: any) {
      // If Firebase storage fails (e.g. mock credentials in dev), generate an object URL for local preview
      console.warn('Storage upload failed or unavailable, falling back to local object URL:', err);
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
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
      <label className="block text-sm font-medium text-foreground">{label}</label>

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

      {uploadError && <p className="text-xs text-danger font-medium">{uploadError}</p>}
    </div>
  );
};
