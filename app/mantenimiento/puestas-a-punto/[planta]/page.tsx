import Link from 'next/link';

export default async function PlantaPage({ params }: { params: Promise<{ planta: string }> }) {
  const resolvedParams = await params;
  const basePath = `/puestas-a-punto/${resolvedParams.planta}`;
  
  const actions = [
    { 
        title: "Crear", 
        path: `${basePath}/crear`, 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#105B3A" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v88a8,8,0,0,1-16,0V136H32a8,8,0,0,1,0-16h88V32a8,8,0,0,1,16,0v88h88A8,8,0,0,1,224,128Z"></path></svg> 
    },
    { 
        title: "Ver", 
        path: `${basePath}/ver`, 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.59-19.18-26.78-36.63C200.75,69,168.1,56,128,56S55.25,69,35.47,88.13C17.28,105.58,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.59,19.18,26.78,36.63C55.25,187,87.9,200,128,200s72.75-13,92.53-32.13c18.19-17.45,26.43-35.84,26.78-36.63A8,8,0,0,0,247.31,124.76ZM128,184c-35.35,0-63.5-10.9-80.66-26.4C33.31,144.91,26.4,131.7,24.3,128c2.1-3.7,9-16.91,23.04-29.6C64.5,82.9,92.65,72,128,72s63.5,10.9,80.66,26.4C222.69,111.09,229.6,124.3,231.7,128c-2.1,3.7-9,16.91-23.04,29.6C191.5,173.1,163.35,184,128,184Zm0-94a38,38,0,1,0,38,38A38.05,38.05,0,0,0,128,90Zm0,60a22,22,0,1,1,22-22A22,22,0,0,1,128,150Z"></path></svg> 
    },
    { 
        title: "Modificar", 
        path: `${basePath}/modificar`, 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l12.69-12.69,44.69,44.69Z"></path></svg> 
    },
    { 
        title: "Realizar", 
        path: `${basePath}/realizar`, 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM224,128a96,96,0,1,1-96-96A96.11,96.11,0,0,1,224,128Zm-16,0a80,80,0,1,0-80,80A80.09,80.09,0,0,0,208,128Z"></path></svg>
    },
    { 
        title: "Auditoría", 
        path: `${basePath}/auditoria`, 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40V216a24,24,0,0,1-24,24H64a24,24,0,0,1-24-24V40A24,24,0,0,1,64,16H192A24,24,0,0,1,216,40Zm-16,0a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8ZM165.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L120,124.69l34.34-34.35A8,8,0,0,1,165.66,90.34ZM176,160a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,160Z"></path></svg>
    }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto' }}>

      <div className="modules-grid-centered" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.2rem', width: '100%', justifyContent: 'flex-start' }}>
         {actions.map((act, index) => (
            <Link href={act.path} key={index} className="module-card-icon" style={{ animationDelay: `${index * 0.1}s`, padding: '2rem 1.5rem', gap: '1rem' }}>
              <div className="icon-container" style={{ width: '64px', height: '64px', borderRadius: '16px' }}>
                 {act.icon}
              </div>
              <h3 className="card-title-centered" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{act.title}</h3>
            </Link>
         ))}
      </div>
    </div>
  );
}
