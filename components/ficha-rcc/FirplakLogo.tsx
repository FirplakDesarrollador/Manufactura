import React from 'react';

interface FirplakLogoProps {
  height?: string;
  width?: string;
  light?: boolean;
  style?: React.CSSProperties;
}

const FirplakLogo: React.FC<FirplakLogoProps> = ({ 
  height = '60px', 
  width = 'auto',
  light = true,
  style
}) => {
  const logoSrc = light ? '/logo-firplak-white.png' : '/logo-firplak.png';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <img 
        src={logoSrc} 
        alt="FIRPLAK" 
        style={{ 
          height: height, 
          width: width, 
          objectFit: 'contain',
          display: 'block' 
        }} 
      />
    </div>
  );
};

export default FirplakLogo;
