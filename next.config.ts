import type { NextConfig } from "next";

const nextConfig: any = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/mantenimiento',
        destination: '/mtto-autonomo',
      },
      {
        source: '/mantenimiento/:path*',
        destination: '/mtto-autonomo/:path*',
      },
      {
        source: '/puestas-a-punto',
        destination: '/mtto-autonomo/puestas-a-punto',
      },
      {
        source: '/puestas-a-punto/:path*',
        destination: '/mtto-autonomo/puestas-a-punto/:path*',
      },
      {
        source: '/tarjetas-falla',
        destination: '/mtto-autonomo/tarjetas-falla',
      },
      {
        source: '/tarjetas-falla/:path*',
        destination: '/mtto-autonomo/tarjetas-falla/:path*',
      },
      {
        source: '/lilac',
        destination: '/mtto-autonomo/lilac',
      },
      {
        source: '/lilac/:path*',
        destination: '/mtto-autonomo/lilac/:path*',
      },
    ];
  },
};

export default nextConfig;
