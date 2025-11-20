import Link from 'next/link';
import InteractiveButton from './(client)/interactive-button';
import FeatureCard from '../components/ui/feature-card';
import AppShell from '../components/layout/app-shell';
import SectionHeader from '../components/ui/section-header';

export default function Home() {
  return (
    <AppShell>
      <main id="main" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #000000 100%)' }}>

      {/* Hero Section */}
      <section className="parallax min-h-screen flex items-center justify-center relative overflow-hidden" style={{ position: 'relative' }}>
        <div className="parallax-layer" data-speed="0.2" style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: 'url(https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1600&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3
        }} />
        <div className="parallax-layer" data-speed="0.5" style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(0, 0, 0, 0.85)), url(/brand/PT.MMM.svg)",
          backgroundSize: 'cover, 80vmin',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat'
        }} />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6" style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: 16,
          padding: '48px 32px'
        }}>
          <div style={{ 
            display: 'inline-block',
            background: '#FFD700',
            color: '#000',
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24
          }}>
            Sejak 1998 • Sidoarjo
          </div>
          
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 16,
            lineHeight: 1.2
          }}>
            Kemasan Plastik Premium &<br />
            <span style={{ color: '#FFD700' }}>Sistem Logistik Digital Terintegrasi</span>
          </h1>
          
          <p style={{
            fontSize: 18,
            color: '#f4f4f5',
            marginBottom: 32,
            lineHeight: 1.6,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            PT Mitramulia Makmur menghadirkan solusi kemasan plastik dan kaleng cat berkualitas tinggi 
            dengan modul Digital Tracking — integrasi Google Sheets, Supabase, dan API scan real-time.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <InteractiveButton href="#modul-x" className="ui-btn ui-btn--primary ui-pressable">
              Pelajari Sistem Logistik
            </InteractiveButton>
            <InteractiveButton href="#kontak" className="ui-btn ui-btn--outline ui-pressable">
              Hubungi Tim Kami
            </InteractiveButton>
          </div>
        </div>
      </section>

      {/* Tentang Perusahaan */}
      <section id="tentang" className="py-20" style={{ background: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Tentang PT Mitramulia Makmur"
            subtitle="Perusahaan manufaktur kemasan plastik dan houseware yang berlokasi di Sidoarjo, bagian dari Tancorp Group, dengan fokus pada kualitas, ekspor, dan sistem manajemen modern."
            align="center"
            badge="Sejak 1998 • Sidoarjo"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="Kemasan Industri"
              description="Botol, ember, container plastik berkualitas tinggi untuk kebutuhan industri dan retail."
              image="/brand/Image/images (1).jpeg"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16v10H4zM6 5h12v2H6z"/>
                </svg>
              }
            />
            <FeatureCard
              title="Produk Moorlife"
              description="Houseware premium dengan standar ekspor, tahan lama dan estetik."
              image="/brand/Image/morlife.svg"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
              }
            />
            <FeatureCard
              title="Ekspor & Kualitas"
              description="Standar kualitas internasional dengan sertifikasi untuk pasar global."
              image="/brand/Image/expoer.jpg"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              }
            />
            <FeatureCard
              title="5R & Lingkungan"
              description="Komitmen terhadap prinsip 5R (Ringkas, Rapi, Resik, Rawat, Rajin) dan keberlanjutan."
              image="/brand/Image/5k5R.jpg"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Digital Tracking Section */}
      <section id="modul-x" className="py-20" style={{ background: 'rgba(0, 0, 0, 0.9)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Digital Tracking — Sistem Logistik Terintegrasi"
            subtitle="Solusi digital internal PT MMM yang menghubungkan Google Sheets, Supabase, dan API scan untuk tracking order, shipment, dan event logistik secara real-time."
            align="center"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 16,
              padding: 32
            }}>
              <h3 style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#FFD700',
                marginBottom: 16
              }}>
                Integrasi Digital End-to-End
              </h3>
              <p style={{
                color: '#f4f4f5',
                lineHeight: 1.6,
                marginBottom: 20
              }}>
                Digital Tracking memastikan seluruh aktivitas logistik yang berkaitan dengan FormCode 
                tersinkron secara konsisten antara Google Sheets (input admin), Supabase Postgres 
                (data terpusat), dan API scan (event real-time dari lapangan).
              </p>
              <ul style={{
                color: '#b0b7c3',
                listStyle: 'none',
                padding: 0
              }}>
                <li style={{ marginBottom: 8 }}>✓ Order management dari Sheet ke database</li>
                <li style={{ marginBottom: 8 }}>✓ Shipment tracking dengan FormCode unik</li>
                <li style={{ marginBottom: 8 }}>✓ Event scan: gate_in, gate_out, load_start, load_finish</li>
                <li>✓ Dashboard KPI real-time untuk manajemen</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 16,
              padding: 32
            }}>
              <h3 style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#FFD700',
                marginBottom: 16
              }}>
                Alur Kerja Digital Tracking
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFD700',
                    color: '#000',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 14
                  }}>1</div>
                  <div>
                    <div style={{ color: '#FFD700', fontWeight: 500 }}>Admin Input</div>
                    <div style={{ color: '#b0b7c3', fontSize: 14 }}>Scheduler mengisi order & shipment di Google Sheets</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFD700',
                    color: '#000',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 14
                  }}>2</div>
                  <div>
                    <div style={{ color: '#FFD700', fontWeight: 500 }}>Auto Sync</div>
                    <div style={{ color: '#b0b7c3', fontSize: 14 }}>Apps Script sync data ke Supabase setiap jam</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFD700',
                    color: '#000',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 14
                  }}>3</div>
                  <div>
                    <div style={{ color: '#FFD700', fontWeight: 500 }}>Field Operations</div>
                    <div style={{ color: '#b0b7c3', fontSize: 14 }}>Security/driver scan QR code untuk update status</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFD700',
                    color: '#000',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 14
                  }}>4</div>
                  <div>
                    <div style={{ color: '#FFD700', fontWeight: 500 }}>Real-time Dashboard</div>
                    <div style={{ color: '#b0b7c3', fontSize: 14 }}>Manajemen monitor KPI dan performance logistik</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="Input dari Admin/Scheduler"
              description="Data order dan shipment dimasukkan melalui Google Sheets dengan interface familiar dan mudah digunakan."
              image="/brand/Image/admin.png"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
              }
            />
            <FeatureCard
              title="Database Supabase"
              description="Sistem database terpusat yang menyediakan single source of truth untuk semua data logistik."
              image="/brand/Image/1pack.png"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              }
            />
            <FeatureCard
              title="UI Scanner Lapangan"
              description="Interface mobile-friendly untuk security, driver, dan ops untuk melakukan scan dan update status."
              image="/brand/Image/kiriman.png"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* KPI & Dashboard Section */}
      <section className="py-20" style={{ background: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="KPI & Dashboard Real-time"
            subtitle="Monitor performa logistik harian dengan metrik yang jelas dan actionable untuk pengambilan keputusan cepat."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#FFD700',
                marginBottom: 8
              }}>127</div>
              <div style={{
                color: '#b0b7c3',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Gate In Hari Ini</div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#FFD700',
                marginBottom: 8
              }}>89</div>
              <div style={{
                color: '#b0b7c3',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Load Finish</div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#FFD700',
                marginBottom: 8
              }}>2.3</div>
              <div style={{
                color: '#b0b7c3',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Jam Rata-rata Loading</div>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#FFD700',
                marginBottom: 8
              }}>98.5%</div>
              <div style={{
                color: '#b0b7c3',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>On-time Delivery</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: 16,
            padding: 32
          }}>
            <h3 style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#FFD700',
              marginBottom: 16
            }}>
              Manfaat Bisnis Modul X
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 style={{
                  color: '#FFD700',
                  fontWeight: 600,
                  marginBottom: 8
                }}>Efisiensi Operasional</h4>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Mengurangi waktu administrasi dengan integrasi otomatis antara Sheet dan database,
                  menghilangkan double input dan human error.
                </p>
              </div>
              <div>
                <h4 style={{
                  color: '#FFD700',
                  fontWeight: 600,
                  marginBottom: 8
                }}>Traceability Lengkap</h4>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Setiap shipment bisa dilacak dari order sampai delivery dengan event timestamp lengkap,
                  memudahkan audit dan penyelesaian masalah.
                </p>
              </div>
              <div>
                <h4 style={{
                  color: '#FFD700',
                  fontWeight: 600,
                  marginBottom: 8
                }}>KPI Real-time</h4>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Dashboard menampilkan metrik performa harian yang bisa diakses kapan saja,
                  mendukung pengambilan keputusan berbasis data.
                </p>
              </div>
              <div>
                <h4 style={{
                  color: '#FFD700',
                  fontWeight: 600,
                  marginBottom: 8
                }}>Komunikasi Terpusat</h4>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Semua pihak (admin, security, driver, manajemen) menggunakan data yang sama,
                  mengurangi miss komunikasi dan konflik informasi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section id="kontak" className="py-20" style={{ background: 'rgba(0, 0, 0, 0.9)' }}>
        <div className="container mx-auto px-6 text-center">
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            color: '#FFD700',
            marginBottom: 16
          }}>
            Siap Meningkatkan Efisiensi Logistik Anda?
          </h2>
          <p style={{
            fontSize: 18,
            color: '#b0b7c3',
            maxWidth: '700px',
            margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            Hubungi tim PT Mitramulia Makmur untuk konsultasi kebutuhan kemasan plastik premium 
            dan sistem logistik digital yang dapat disesuaikan dengan kebutuhan bisnis Anda.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <InteractiveButton href="mailto:sales@ptmmm.co" className="ui-btn ui-btn--primary ui-pressable">
              Email Sales Team
            </InteractiveButton>
            <InteractiveButton href="tel:+62310000000" className="ui-btn ui-btn--outline ui-pressable">
              Telepon +62 31 0000 0000
            </InteractiveButton>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: 16,
            padding: 32,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h3 style={{
              color: '#FFD700',
              fontWeight: 600,
              marginBottom: 16
            }}>
              Lokasi & Informasi
            </h3>
            <div style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: '#FFD700' }}>Kantor Pusat:</strong><br />
                Kawasan Industri Sidoarjo, Jawa Timur
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: '#FFD700' }}>Email:</strong> sales@ptmmm.co<br />
                <strong style={{ color: '#FFD700' }}>Telepon:</strong> +62 31 0000 0000
              </p>
              <p>
                <strong style={{ color: '#FFD700' }}>Jam Operasional:</strong><br />
                Senin - Jumat: 08:00 - 17:00 WIB
              </p>
            </div>
          </div>
        </div>
      </section>

    </main>
  </AppShell>
  );
}