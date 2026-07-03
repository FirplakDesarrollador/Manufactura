import type { Metadata } from 'next';
import './mtto-autonomo.css';

export const metadata: Metadata = {
  title: 'Mantenimiento Autónomo',
  description: 'App para el Mantenimiento Autónomo de FIRPLAK',
};

export default function MttoAutonomoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mtto-autonomo-wrapper min-h-screen">
      {children}
    </div>
  );
}
