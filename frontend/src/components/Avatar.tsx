"use client";

import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Avatar({
  src,
  name,
  alt,
  size = "md",
  className = "",
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Get first letter of name for fallback
  const getInitial = (name: string | null | undefined): string => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  // Size classes
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-lg",
  };

  const shouldShowImage = src && !imageError;

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt || name || "User"}
          className={`${sizeClasses[size]} rounded-full border border-neutral-200 object-cover`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-primary-500 border border-neutral-200 flex items-center justify-center`}
        >
          <span className="text-white font-medium">{getInitial(name)}</span>
        </div>
      )}
    </div>
  );
}
