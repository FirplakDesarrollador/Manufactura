'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { History, Plus, BarChart3, Calendar, ShieldCheck, BookOpen, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SubHeader() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const allowedAdminEmails = ['coordinacioncalidad@firplak.com', 'estiven.londono@firplak.com', 'jakeline.chaverra@firplak.com'];
        if (data.user.email && allowedAdminEmails.includes(data.user.email)) {
          setIsAdmin(true);
        }
      }
    });
  }, []);

  const menuItems = [
    {
      label: 'Historial',
      href: '/opt-sistemica/historial',
      icon: <History size={16} />,
      visible: true
    },
    {
      label: 'Nuevo',
      href: '/opt-sistemica/nueva-opt',
      icon: <Plus size={16} />,
      visible: true
    },
    {
      label: 'Indicadores',
      href: '/opt-sistemica/indicadores',
      icon: <BarChart3 size={16} />,
      visible: true
    },
    {
      label: 'Agendamiento',
      href: '/opt-sistemica/agendamiento',
      icon: <Calendar size={16} />,
      visible: true
    },
    {
      label: 'Guía',
      href: '/opt-sistemica/guia',
      icon: <BookOpen size={16} />,
      visible: true
    },
    {
      label: 'Criterios de Calificación',
      href: '/opt-sistemica/criterios',
      icon: <ClipboardCheck size={16} />,
      visible: true
    },
    {
      label: 'Administración',
      href: '/opt-sistemica/admin',
      icon: <ShieldCheck size={16} />,
      visible: isAdmin
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.filter(item => item.visible).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              style={{ textDecoration: 'none' }}
              className="flex-shrink-0"
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
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
