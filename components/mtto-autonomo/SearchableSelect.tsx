"use client";
import React, { useState, useEffect, useRef } from 'react';

interface Item {
  id: string | number;
  label: string;
}

export default function SearchableSelect({ label, options, value, onChange, placeholder, style, labelStyle }: { 
    label: string; 
    options: Item[]; 
    value: string; 
    onChange: (val: string) => void; 
    placeholder: string; 
    style?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', flex: 1, ...style }}>
      {label && <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif", ...labelStyle }}>{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '10px 14px', 
          borderRadius: '10px', 
          border: '1px solid #E2E8F0', 
          backgroundColor: 'white', 
          cursor: 'pointer', 
          fontSize: '0.9rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          color: '#1A445B', 
          minHeight: '44px',
          transition: 'all 0.2s ease',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }
        }}
      >
        <span style={{ opacity: value ? 1 : 0.5, fontWeight: value ? 700 : 400, fontFamily: "'Inter', sans-serif" }}>{value || placeholder}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▼</span>
      </div>
      {isOpen && (
        <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            backgroundColor: 'white', 
            border: '1px solid #E2E8F0', 
            borderRadius: '12px', 
            marginTop: '8px', 
            zIndex: 1000, 
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)', 
            maxHeight: '280px', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            animation: 'fadeInDown 0.2s ease-out'
        }}>
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{ padding: '10px', borderBottom: '1px solid #F1F5F9' }}>
            <input
              type="text" autoFocus placeholder="Filtrar opciones..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.9rem', color: '#1A445B', backgroundColor: '#F8FAFC', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '5px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.id} 
                onClick={() => { onChange(opt.label); setIsOpen(false); setSearchTerm(''); }} 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '6px',
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  color: '#1A445B', 
                  backgroundColor: value === opt.label ? '#F0F9FF' : 'transparent',
                  transition: 'background-color 0.2s ease',
                  fontWeight: value === opt.label ? 700 : 400
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = value === opt.label ? '#E0F2FE' : '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === opt.label ? '#F0F9FF' : 'transparent'}
              >
                {opt.label}
              </div>
            )) : <div style={{ padding: '20px', fontSize: '0.85rem', color: '#94A3B8', textAlign: 'center' }}>No existen resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}
