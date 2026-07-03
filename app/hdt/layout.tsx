import './hdt-globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión HDT | Firplak',
  description: 'Sistema de gestión de Hojas de División de Trabajo de Firplak',
}

export default function HdtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hdt-root" style={{ fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
