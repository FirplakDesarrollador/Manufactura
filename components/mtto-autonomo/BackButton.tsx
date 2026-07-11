"use client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BackButton({ currentPlanta, showHome = false }: { currentPlanta?: string, showHome?: boolean }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button 
        onClick={() => router.back()} 
        title="Volver"
        style={{ 
          width: '42px', 
          height: '42px', 
          borderRadius: '50%',
          backgroundColor: '#EDF0F1', 
          color: 'var(--primary-color)', 
          border: 'none',
          cursor: 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8ea'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#EDF0F1'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
      </button>

      {showHome && (
        <Link 
          href="/home" 
          title="Inicio"
          style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '50%',
            backgroundColor: '#EDF0F1', 
            color: '#1A445B', 
            border: 'none',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            textDecoration: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            transition: '0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8ea'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#EDF0F1'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z"></path></svg>
        </Link>
      )}
    </div>
  );
}
