import Link from 'next/link';
import type { ReactNode } from 'react';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-wrapper bg-white">
      {/* Navbar Superior */}
      <nav className="dashboard-navbar-white">
        <div className="navbar-content">
          <Link href="/mtto-autonomo/home" className="navbar-brand">
            <img 
              src="/logo_2.png" 
              alt="FIRPLAK" 
              className="navbar-logo" 
              style={{ height: '35px', width: 'auto' }}
            />
          </Link>
          <div className="navbar-links">
            <Link href="/" className="nav-link-logout">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" style={{ marginRight: '6px' }}>
                <path d="M116,216a12,12,0,0,1-12,12H48a12,12,0,0,1-12-12V40A12,12,0,0,1,48,28h56a12,12,0,0,1,0,24H60V204h44A12,12,0,0,1,116,216Zm108.49-96.49-40-40a12,12,0,1,0-17,17L183,116H104a12,12,0,0,0,0,24h79l-15.52,19.51a12,12,0,1,0,17,17l40-40A12,12,0,0,0,224.49,119.51Z"></path>
              </svg>
              Cerrar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="dashboard-main bg-white">
        {children}
      </main>
    </div>
  );
}

