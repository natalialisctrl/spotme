import React from 'react';

interface LowerBodyIconProps {
  className?: string;
}

export const LowerBodyIcon: React.FC<LowerBodyIconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M10,3 C10,3 16,3.2 16,6 C16,8.8 13,11 13,15 C13,19 14,21 10,21 C6,21 8,17 8,13 C8,9 4,9 4,5 C4,1 10,3 10,3 Z"></path>
      <path d="M13,10 C13,10 16,10 16,12"></path>
      <path d="M10,13 C10,13 12,13 12,15"></path>
    </svg>
  );
};

export default LowerBodyIcon;