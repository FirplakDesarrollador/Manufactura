import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Manufactura Firplak',
    short_name: 'Manufactura',
    description: 'Sistema de Control de Piso - Manufactura Firplak',
    start_url: '/home',
    display: 'standalone',
    background_color: '#F6F3EE',
    theme_color: '#324354',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
