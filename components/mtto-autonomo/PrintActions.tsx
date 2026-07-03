'use client';

export function PrintActions() {
  return (
    <button 
      onClick={() => window.print()}
      style={{ 
        padding: '0.6rem 1.5rem', 
        backgroundColor: '#1A445B', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        fontSize: '0.9rem', 
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-12 0v4h12v-4m-12 0h12"/>
      </svg>
      Imprimir
    </button>
  );
}
