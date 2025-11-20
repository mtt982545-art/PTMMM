export type ServiceItem = {
  title: string
  description: string
  image: string
}

export type PortfolioItem = {
  title: string
  description: string
  image: string
}

export const company = {
  name: 'PT Mitramulia Makmur (MMM Plastic)',
  tagline: 'Solusi Kemasan Plastik & Kaleng Cat yang Premium dan Andal',
  description:
    'Produsen dan penyedia kemasan plastik serta kaleng cat untuk beragam kebutuhan industri di Indonesia. Fokus pada kualitas, keandalan, dan layanan terpadu.',
  valuePropositions: [
    'Kualitas material tinggi dengan kontrol mutu konsisten',
    'Desain kemasan fungsional dan siap branding',
    'Rantai pasok yang responsif dan tepat waktu',
    'Layanan kustom sesuai spesifikasi industri',
  ],
  vision:
    'Menjadi mitra terdepan dalam solusi kemasan industri yang inovatif, berkelanjutan, dan bernilai tinggi.',
  mission: [
    'Menyediakan produk kemasan berkualitas premium yang aman dan tahan lama',
    'Meningkatkan efisiensi dan keandalan distribusi bagi pelanggan',
    'Mengembangkan desain dan layanan kustom yang relevan dengan kebutuhan pasar',
    'Menjaga komitmen terhadap keberlanjutan dan kepuasan pelanggan',
  ],
  services: [
    {
      title: 'Kemasan Plastik',
      description:
        'Botol, ember, container, dan komponen plastik berkualitas untuk lini produksi.',
      image:
        'https://images.unsplash.com/photo-1588473864666-9b4b5fd0ee61?q=80&w=1200&auto=format&fit=crop',
    },
    {
      title: 'Kaleng Cat',
      description:
        'Kaleng cat dengan ketahanan tinggi dan segel presisi untuk menjaga kualitas.',
      image:
        'https://images.unsplash.com/photo-1586386746861-9aef29e62b1a?q=80&w=1200&auto=format&fit=crop',
    },
    {
      title: 'Solusi Kustom',
      description:
        'Desain dan produksi kemasan khusus sesuai spesifikasi dan identitas brand.',
      image:
        'https://images.unsplash.com/photo-1520607162513-777b3b3f0bda?q=80&w=1200&auto=format&fit=crop',
    },
  ] as ServiceItem[],
  portfolio: [
    {
      title: 'Implementasi Kemasan Kimia',
      description:
        'Optimalisasi packaging untuk bahan kimia cair, memastikan keamanan distribusi.',
      image: 'https://picsum.photos/seed/ptmmm-1/800/500',
    },
    {
      title: 'Branding Kaleng Cat Premium',
      description:
        'Produksi kaleng cat tahan bocor dengan branding elegan untuk pasar ritel.',
      image: 'https://picsum.photos/seed/ptmmm-2/800/500',
    },
    {
      title: 'Solusi Kustom Manufaktur',
      description:
        'Kemasan kustom untuk kebutuhan pabrik dengan standar mutu ketat.',
      image: 'https://picsum.photos/seed/ptmmm-3/800/500',
    },
  ] as PortfolioItem[],
  contact: {
    phone: '+62-21-0000-000',
    email: 'sales@ptmmm.co',
    address: 'Kawasan Industri, Jakarta',
  },
}