'use client'

import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle: string;
  backUrl?: string;
  onBack?: () => void;
  userEmail?: string;
  actionButton?: React.ReactNode;
  showLogout?: boolean;
  onLogout?: () => void;
}

export default function Header({
  title,
  subtitle,
  backUrl,
  onBack,
  userEmail,
  actionButton,
  showLogout = true,
  onLogout
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="relative z-50 bg-[#324354] border-b border-[#324354] shadow-md sticky top-0 font-sans">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left Side: Back Button & Title/Subtitle */}
        <div className="flex items-center gap-6">
          <button
            onClick={onBack ? onBack : () => backUrl && router.push(backUrl)}
            className="group flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300 shadow-sm cursor-pointer"
            title="Volver"
          >
            <svg className="w-5 h-5 text-[#F6F3EE] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-light text-white tracking-widest uppercase leading-none mb-1">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#F6F3EE]/70 font-medium tracking-wide leading-none">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Action Button & Welcome User & Logout Button */}
        <div className="flex items-center space-x-6 min-w-0 shrink-0">
          {actionButton && (
            <div className="shrink-0">
              {actionButton}
            </div>
          )}
          
          {userEmail && (
            <div className="text-right hidden md:block max-w-[200px] lg:max-w-[300px] min-w-0">
              <p className="text-[10px] text-[#F6F3EE]/60 font-bold tracking-widest uppercase">Bienvenido</p>
              <p className="text-sm font-semibold text-white truncate" title={userEmail}>
                {userEmail}
              </p>
            </div>
          )}

          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-[#7B8E90] hover:bg-[#6c7d7f] text-white rounded-xl transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md shrink-0 cursor-pointer"
            >
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
