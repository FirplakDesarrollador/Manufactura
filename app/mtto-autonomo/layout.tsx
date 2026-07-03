import './mtto-globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mantenimiento Autónomo',
  description: 'App para el Mantenimiento Autónomo de FIRPLAK',
};

export default function MttoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mtto-app">
      {children}
    </div>
  );
}
