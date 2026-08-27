export const EXPLICIT_NAME_MAP: Record<string, string> = {
  'alejadro vegas': 'Pedro Alejandro Vegas Sanchez',
  'alejandro vegas': 'Pedro Alejandro Vegas Sanchez',
  'andres saldarriaga': 'Hector Andrés Saldarriaga Palacio',
  'andrés saldarriaga': 'Hector Andrés Saldarriaga Palacio',
  'carolina escobar': 'Carolina Escobar Madrid',
  'carolina escobar m.': 'Carolina Escobar Madrid',
  'dimer vergara': 'Dimer Gonzalo Vergara Delgado',
  'edison hernandez': 'Edisson Arley Hernández',
  'edisson hernandez': 'Edisson Arley Hernández',
  'elias molina': 'Jorge Elias Molina',
  'estiven londoño': 'Ederson Estiven Londoño Alvarez',
  'estiven londono': 'Ederson Estiven Londoño Alvarez',
  'jair alvarez': 'Jair Alejandro Alvarez Davila',
  'jakeline chaverra': 'Jakeline Chaverra Soto',
  'juan david montoya': 'Juan David Montoya Pelaez',
  'juan david ramirez': 'Juan David Ramirez Echeverri',
  'juliana ramirez': 'Juliana Ramirez Valencia',
  'maria isabel escobar': 'Maria Isabel Escobar Laurens',
  'osnar mejía': 'Osnar Mejias Mejias',
  'osnar mejia': 'Osnar Mejias Mejias',
  'roberto aguilar': 'Roberto Elías Aguilar Sierra',
  'sara aguilar': 'Sara María Aguilar Sierra',
  'solangie baquero': 'Brillitt Solanlli Baquero Diaz',
  'yury mar aguas': 'Yury Mar Aguas Ruiz',
  'hector chinchilla': 'Héctor Jose Chinchilla Trigos'
};

export function resolveNombreCompleto(name: string | undefined | null, empleadosList: string[] = []): string {
  if (!name) return '';
  const trimmed = name.trim();
  const low = trimmed.toLowerCase();
  
  if (EXPLICIT_NAME_MAP[low]) return EXPLICIT_NAME_MAP[low];

  // Si ya coincide exactamente con alguno de la lista de empleados
  const exact = empleadosList.find(e => e.toLowerCase() === low);
  if (exact) return exact;

  // Buscar por tokens sin tildes
  const tokens = low.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ').filter(Boolean);
  if (tokens.length > 0) {
    const match = empleadosList.find(e => {
      const empNorm = e.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return tokens.every(t => empNorm.includes(t));
    });
    if (match) return match;
  }

  return trimmed;
}

export const RESPONSABLES_LIST = [
  'Brillitt Solanlli Baquero Diaz',
  'Carolina Escobar Madrid',
  'Dimer Gonzalo Vergara Delgado',
  'Ederson Estiven Londoño Alvarez',
  'Edisson Arley Hernández',
  'Hector Andrés Saldarriaga Palacio',
  'Héctor Jose Chinchilla Trigos',
  'Jair Alejandro Alvarez Davila',
  'Jakeline Chaverra Soto',
  'Jorge Elias Molina',
  'Juan David Montoya Pelaez',
  'Juan David Ramirez Echeverri',
  'Juliana Ramirez Valencia',
  'Maria Isabel Escobar Laurens',
  'Osnar Mejias Mejias',
  'Pedro Alejandro Vegas Sanchez',
  'Roberto Elías Aguilar Sierra',
  'Sara María Aguilar Sierra',
  'Yury Mar Aguas Ruiz'
].sort();

export const PLANTAS_LIST = [
  'Mármol Sintético',
  'Fibra de vidrio',
  'Muebles',
  'Cefi'
];

export const ORIGENES_LIST = [
  'Saldos',
  'Destrucciones',
  'IFI',
  'Rechazos',
  'Reclamos Cliente'
];
