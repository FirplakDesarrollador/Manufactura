import './ficha.css';

export const metadata = {
  title: 'Ficha de Alerta RRC',
  description: 'Sistema de Gestión de Alertas y Defectos - Firplak',
};

export default function FichaRccLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ficha-app-container">
      {children}
    </div>
  );
}
