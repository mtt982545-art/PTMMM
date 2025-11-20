/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

// Opsi C (opsional): Integrasi next-pwa (build-only)
let withPWA = (cfg) => cfg;
try {
  const pwa = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true
  });
  withPWA = pwa;
} catch (e) {
  // next-pwa belum diinstall: lanjut tanpa PWA
  console.warn('[next.config] next-pwa tidak terpasang, melewati integrasi PWA');
}

module.exports = withPWA(nextConfig);
