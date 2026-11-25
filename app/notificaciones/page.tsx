'use client';

// Notificaciones (EN CONSTRUCCIÓN): novedades, asignación de tareas, problemas y mantenimiento dirigidos a cada usuario.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ClipboardList, AlertTriangle, Wrench, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

const PROXIMAMENTE = [
  { icono: Megaphone, titulo: 'Novedades', texto: 'Avisos y comunicados dirigidos a una persona, un área o una planta.' },
  { icono: ClipboardList, titulo: 'Asignación de tareas', texto: 'Aviso cuando le asignan una tarea u orden de trabajo, con su plazo.' },
  { icono: AlertTriangle, titulo: 'Problemas', texto: 'Reporte de problemas o anomalías a la persona responsable.' },
  { icono: Wrench, titulo: 'Mantenimiento', texto: 'Órdenes nuevas, reasignadas, atrasadas o cerradas del Gestor de Mantenimiento.' },
];

export default function NotificacionesPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email || '');
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex flex-col font-sans text-[#000000]">
      <Header
        title="Notificaciones"
        subtitle=""
        compact={true}
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }}
      />

      <main className="flex-1 flex justify-center items-start sm:items-center p-4 sm:p-6 w-full">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#e2ded5] shadow-sm p-6 sm:p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-5 text-amber-500">
            <Bell className="w-10 h-10" />
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 mb-3">En construcción</span>
          <h2 className="text-2xl font-bold text-[#324354] mb-2">Notificaciones</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-md">
            Aquí cada usuario recibirá sus avisos de la planta. Estamos trabajando en este módulo; pronto estará disponible.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left mb-8">
            {PROXIMAMENTE.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="flex items-start gap-3 rounded-2xl bg-[#F6F3EE] border border-[#e2ded5] p-3">
                <span className="w-8 h-8 rounded-lg bg-[#324354] text-white flex items-center justify-center shrink-0"><Icono size={16} /></span>
                <div>
                  <div className="text-xs font-black text-[#324354]">{titulo}</div>
                  <div className="text-[11px] text-slate-600 leading-snug">{texto}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/home')} className="btn-primary w-full sm:w-auto sm:px-10">
            Volver al inicio
          </button>
        </div>
      </main>
    </div>
  );
}
