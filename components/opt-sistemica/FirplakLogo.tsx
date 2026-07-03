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
  // Determine which version to use based on color prop
  // white logo for dark backgrounds (header), dark logo for light backgrounds (modals)
  const isWhite = color === 'white' || color === '#fff' || color === '#ffffff';
  const src = isWhite ? '/firplak-logo-white.png' : '/firplak-logo-dark.png';

  const heightNum = typeof height === 'number' ? height : parseInt(String(height), 10);
  // The original logo image has slogan included in the dark version
  // For slogan, use the dark version which already has "inspirando hogares"
  // For no-slogan uses (header), use white version cropped visually via height

  return (
    <img
      src={src}
      alt="Firplak - inspirando hogares"
      height={showSlogan ? heightNum * 1.5 : heightNum}
      style={{
        display: 'block',
        objectFit: 'contain',
        maxWidth: '100%',
      }}
      className={className}
    />
  );
};

export default FirplakLogo;
