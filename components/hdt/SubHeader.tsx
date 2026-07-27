'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, Edit, Plus, BarChart3 } from 'lucide-react';
import { Suspense } from 'react';

function SubHeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const menuItems = [
    {
      label: 'Ver HDTs',
      href: '/hdt/plants?action=view',
      isActive: pathname.includes('/hdt/plants') && action === 'view',
      icon: <Eye size={16} />
    },
    {
      label: 'Editar HDT',
      href: '/hdt/plants?action=edit',
      isActive: pathname.includes('/hdt/plants') && action === 'edit',
      icon: <Edit size={16} />
    },
    {
      label: 'Crear HDT',
      href: '/hdt/create',
      isActive: pathname.includes('/hdt/create'),
      icon: <Plus size={16} />
    },
    {
      label: 'Estadísticas',
      href: '/hdt/statistics',
      isActive: pathname.includes('/hdt/statistics'),
      icon: <BarChart3 size={16} />
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.map((item, idx) => (
          <Link key={idx} href={item.href} style={{ textDecoration: 'none' }} className="flex-shrink-0">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                item.isActive
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export default function SubHeader() {
  return (
    <Suspense fallback={<div className="h-[53px] w-full bg-white border-b border-[#e2ded5]"></div>}>
      <SubHeaderContent />
    </Suspense>
  );
}
