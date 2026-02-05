/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Descomentar para build estático de producción
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Nota: Los headers de seguridad deben configurarse en el servidor web (nginx/Apache)
  // cuando se despliegue el sitio estático
}

module.exports = nextConfig
