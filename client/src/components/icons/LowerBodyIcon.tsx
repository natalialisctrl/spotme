import React from 'react';

interface LowerBodyIconProps {
  className?: string;
}

export const LowerBodyIcon: React.FC<LowerBodyIconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 500 1000" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="30" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Main leg outline - exact tracing from the provided image */}
      <path d="M250,50 C450,50 450,200 350,300 C300,350 300,400 300,500 C300,700 350,850 300,900 C250,950 150,950 150,850 C150,750 200,550 200,400 C200,300 100,300 100,150 C100,50 200,50 250,50" />
      
      {/* Calf muscle detail */}
      <path d="M200,500 C200,500 300,500 350,700" />
      
      {/* Thigh detail */}
      <path d="M300,250 C300,250 400,300 450,400" />
    </svg>
  );
};

export default LowerBodyIcon;