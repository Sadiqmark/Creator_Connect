import React, { useState } from 'react';

interface AvatarWithFallbackProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl font-semibold',
  '2xl': 'w-28 h-28 text-2xl font-bold',
};

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({
  src,
  alt,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Generate 1-2 character initials
  const initials = alt
    ? alt
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : '?';

  const containerClass = `${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border ${className}`;

  if (src && !hasError) {
    return (
      <div className={containerClass}>
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${containerClass} bg-surface-muted text-foreground-muted font-medium select-none`}
      aria-label={alt}
    >
      {initials}
    </div>
  );
};
