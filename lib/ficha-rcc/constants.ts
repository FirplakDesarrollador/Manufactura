export const EXPLICIT_NAME_MAP: Record<string, string> = {
  'alejadro vegas': 'Pedro Alejandro Vegas Sanchez',
  'alejandro vegas': 'Pedro Alejandro Vegas Sanchez',
  'andres saldarriaga': 'Hector Andrés Saldarriaga Palacio',
  'andrés saldarriaga': 'Hector Andrés Saldarriaga Palacio',
  // "Carolina Escobar" es Estiven Londoño (cambio de puesto sin cambio de correo)
  'carolina escobar': 'Ederson Estiven Londoño Alvarez',
  'carolina escobar m.': 'Ederson Estiven Londoño Alvarez',
  'carolina escobar madrid': 'Ederson Estiven Londoño Alvarez',
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
  'juan camilo velez': 'Juan Camilo Vélez Serna',
  'maria elena perez': 'Maria Elena Perez Ospina',
  'maria isabel escobar': 'Maria Isabel Escobar Laurens',
  // El nombre correcto es Osnar Mejias Torrealba (antes se guardaba como 'Osnar Mejias Mejias')
  'osnar mejía': 'Osnar Mejias Torrealba',
  'osnar mejia': 'Osnar Mejias Torrealba',
  'osnar mejias': 'Osnar Mejias Torrealba',
  'osnar mejías': 'Osnar Mejias Torrealba',
  'osnar mejias mejias': 'Osnar Mejias Torrealba',
  'osnar mejía mejía': 'Osnar Mejias Torrealba',
  'roberto aguilar': 'Roberto Elías Aguilar Sierra',
  'sara aguilar': 'Sara María Aguilar Sierra',
  'solangie baquero': 'Brillitt Solanlli Baquero Diaz',
  'yury mar aguas': 'Yury Mar Aguas Ruiz',
  'hector chinchilla': 'Héctor Jose Chinchilla Trigos'
};

// Sin tildes, en minúscula y con un solo espacio: así "Jakeline  Chaverra Soto" y "Jakeline Chaverra Soto" son el mismo
const claveNombre = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.\s]+/g, ' ').trim();

/**
 * Nombre completo y con una sola escritura para cada persona (los registros traen nombres cortos, con o sin tildes y
 * con espacios de más). 1) tabla de nombres conocidos; 2) igual a un nombre de la lista (sin importar tildes ni
 * espacios); 3) la única persona de la lista que contiene todas las palabras. Si no, el nombre limpio.
 */
export function resolveNombreCompleto(name: string | undefined | null, empleadosList: string[] = []): string {
  if (!name) return '';
  const limpio = name.trim().replace(/\s+/g, ' ');
  const k = claveNombre(limpio);
  if (!k) return '';
  const explicito = Object.entries(EXPLICIT_NAME_MAP).find(([a]) => claveNombre(a) === k);
  if (explicito) return explicito[1];

  // Lista de nombres de referencia: la que se pasa, o los responsables conocidos de la RRC
  const lista = [...new Set([...(empleadosList.length ? empleadosList : RESPONSABLES_LIST), ...Object.values(EXPLICIT_NAME_MAP)])];
  const exacto = lista.find(e => claveNombre(e) === k);
  if (exacto) return exacto;

  const tokens = k.split(' ');
  const candidatos = lista.filter(e => { const w = claveNombre(e).split(' '); return tokens.every(t => w.some(x => x.startsWith(t))); });
  if (candidatos.length === 1) return candidatos[0];

  return limpio;
}

export const RESPONSABLES_LIST = [
  'Brillitt Solanlli Baquero Diaz',
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
  'Osnar Mejias Torrealba',
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
