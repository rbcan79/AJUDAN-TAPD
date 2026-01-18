import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AJUDAN TAPD',
    short_name: 'AJUDAN TAPD',
    description: 'Aplikasi Web AJUDAN TAPD Kabupaten Sijunjung',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    icons: [
      {
        src: '/lgapp.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  }
}