import React, { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const Combobox: React.FC<ComboboxProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Seleccionar...', 
  disabled = false,
  className = '',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search on close
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} className={className}>
      {label && <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: disabled ? 'rgba(0,0,0,0.05)' : '#fff',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px 16px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '48px',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(0, 128, 128, 0.1)' : 'none',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)'
        }}
      >
        <span style={{ 
          color: value ? 'var(--text-main)' : 'var(--text-muted)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {value || placeholder}
        </span>
        <span style={{ 
          fontSize: '12px', 
          color: 'var(--text-muted)', 
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 5px)',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Escribe para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                background: 'var(--surface-hover)'
              }}
            />
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    background: value === option ? 'rgba(0, 128, 128, 0.05)' : 'transparent',
                    color: value === option ? 'var(--primary)' : 'inherit',
                    fontWeight: value === option ? '600' : '400',
                    transition: 'all 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.background = value === option ? 'rgba(0, 128, 128, 0.05)' : 'transparent'}
                >
                  {option}
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Combobox;
