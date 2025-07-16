import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export function Logo({
  size = 'md',
  showTagline = false,
  className,
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const taglineClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };


  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2">
        <img
          src="/spotme-logo.png"
          alt="SpotMe Logo"
          className={cn('rounded-lg', sizeClasses[size])}
        />
        <div className="flex flex-col">
          <span className="font-bold text-xl text-[#fc9468]">
            SpotMe
          </span>
          {showTagline && (
            <p className={cn('text-muted-foreground', taglineClasses[size])}>
              Never lift solo again.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

export function LogoWithoutText({ 
  size = 'md',
  className,
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <img
      src="/spotme-logo.png"
      alt="SpotMe Logo"
      className={cn('rounded-lg', sizeClasses[size], className)}
    />
  );
}