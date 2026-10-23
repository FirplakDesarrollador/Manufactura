import type { NextConfig } from "next";

const nextConfig: any = {
  // Solo desarrollo: permite abrir `npm run dev` desde tablets/celulares en la red local
  allowedDevOrigins: ['192.168.1.98'],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/mtto-autonomo',
        destination: '/mantenimiento',
      },
      {
        source: '/mtto-autonomo/:path*',
        destination: '/mantenimiento/:path*',
      },
      {
        source: '/puestas-a-punto',
        destination: '/mantenimiento/puestas-a-punto',
      },
      {
        source: '/puestas-a-punto/:path*',
        destination: '/mantenimiento/puestas-a-punto/:path*',
      },
      {
        source: '/tarjetas-falla',
        destination: '/mantenimiento/tarjetas-falla',
      },
      {
        source: '/tarjetas-falla/:path*',
        destination: '/mantenimiento/tarjetas-falla/:path*',
      },
      {
        source: '/lilac',
        destination: '/mantenimiento/lilac',
      },
      {
        source: '/lilac/:path*',
        destination: '/mantenimiento/lilac/:path*',
      },
    ];
  },
};

export default nextConfig;
