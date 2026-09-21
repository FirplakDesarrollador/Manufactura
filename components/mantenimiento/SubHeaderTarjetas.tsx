'use client';

import React from 'react';
import { History, Plus, BarChart3, HelpCircle, BookOpen } from 'lucide-react';

export type TarjetaTabType = 'historial' | 'nueva' | 'indicadores' | 'guia';

interface SubHeaderTarjetasProps {
  activeTab: TarjetaTabType;
  onSelectTab: (tab: TarjetaTabType) => void;
  onOpenCreateModal?: () => void;
  totalTarjetas?: number;
}

export default function SubHeaderTarjetas({
  activeTab,
  onSelectTab,
  onOpenCreateModal,
  totalTarjetas
}: SubHeaderTarjetasProps) {
  const menuItems: {
    id: TarjetaTabType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'historial',
      label: 'Historial Tarjetas',
      icon: <History size={16} />
    },
    {
      id: 'nueva',
      label: 'Nueva Tarjeta',
      icon: <Plus size={16} />
    },
    {
      id: 'indicadores',
      label: 'Indicadores',
      icon: <BarChart3 size={16} />
    },
    {
      id: 'guia',
      label: '¿Cómo funcionan las tarjetas?',
      icon: <BookOpen size={16} />
    }
  ];

  const handleClick = (item: typeof menuItems[0]) => {
    onSelectTab(item.id);
  };

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-xs relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === 'historial' && typeof totalTarjetas === 'number' && totalTarjetas > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {totalTarjetas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
