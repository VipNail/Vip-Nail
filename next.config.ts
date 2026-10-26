import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Paquetes de servidor que no deben empaquetarse
  serverExternalPackages: ["mysql2"],
  poweredByHeader: false,
  // Hostinger limita los procesos simultáneos (NPROC): build con Webpack (ver package.json),
  // sin worker aparte y con un solo hilo de trabajo para no abrir procesos de más.
  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // El CRM y el login nunca se indexan
      {
        source: "/(crm|entrar|instalar|sin-acceso)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
