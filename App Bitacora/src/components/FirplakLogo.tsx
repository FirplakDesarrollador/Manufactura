import React from 'react';

interface FirplakLogoProps {
  className?: string;
  height?: number | string;
  color?: string;
  showSlogan?: boolean;
}

const FirplakLogo: React.FC<FirplakLogoProps> = ({
  className = '',
  height = 40,
  color = 'currentColor',
  showSlogan = false,
}) => {
  const isWhite = color === 'white' || color === '#fff' || color === '#ffffff';
  const src = isWhite ? '/firplak-logo-white.png' : '/firplak-logo-dark.png';

  const heightNum = typeof height === 'number' ? height : parseInt(String(height), 10);

  return (
    <img
      src={src}
      alt="Firplak - inspirando hogares"
      height={showSlogan ? heightNum * 1.5 : heightNum}
      style={{
        display: 'block',
        height: showSlogan ? heightNum * 1.5 : heightNum,
        objectFit: 'contain',
        maxWidth: '100%',
      }}
      className={className}
    />
  );
};

export default FirplakLogo;
