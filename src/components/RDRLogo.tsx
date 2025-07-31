import React from 'react';

interface RDRLogoProps {
  className?: string;
  showText?: boolean;
}

const RDRLogo: React.FC<RDRLogoProps> = ({ className = "", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className="relative">
        <div className="w-10 h-10 bg-rdr-navy transform rotate-45 flex items-center justify-center">
          <div className="w-3 h-3 bg-white transform -rotate-45"></div>
        </div>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center text-2xl font-bold tracking-tight">
            <span className="text-rdr-navy font-heading">RD</span>
            <span className="text-red-600 font-heading">R</span>
          </div>
          <div className="text-sm font-medium tracking-wide text-rdr-navy opacity-80">
            PROJECT PORTAL
          </div>
        </div>
      )}
    </div>
  );
};

export default RDRLogo;