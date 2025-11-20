/**
 * Digital Tracking Documentation Page - PT Mitramulia Makmur
 * 
 * Testing Scenarios:
 * 1. Load halaman /modul-x - verifikasi semua sections render
 * 2. Check hero section dengan judul "Digital Tracking: Sistem Logistik Terintegrasi"
 * 3. Verifikasi workflow section dengan 4 steps yang clickable
 * 4. Test klik setiap workflow step - harus ada hover effect
 * 5. Check actors section dengan 6 role cards
 * 6. Verifikasi arsitektur teknis dengan 3 platform (Sheets, Supabase, API)
 * 7. Test data flow visualization - harus menampilkan alur data
 * 8. Check CTA section dengan 2 tombol action
 * 9. Verifikasi semua links: Dashboard Demo, Konsultasi Implementasi
 * 10. Test responsive layout: mobile (< 768px)
 * 11. Test responsive layout: tablet (768px - 1024px)
 * 12. Test responsive layout: desktop (> 1024px)
 * 13. Verifikasi branding "Digital Tracking" digunakan konsisten
 * 14. Check glassmorphism effects di cards
 * 15. Test scroll behavior dan smooth transitions
 * 16. Verifikasi penggunaan GlassCard component dengan 3 variasi padding
 * 17. Test konsistensi dengan component-documentation.md
 * 18. Check integrasi dengan schema: form_code, driver_user_id, user_email
 * 19. Test role-based navigation di AppShell
 * 20. Verifikasi tidak ada duplikasi komponen dengan yang sudah ada
 */

'use client';

import AppShell from '@/components/layout/app-shell';
import FeatureCard from '../../components/ui/feature-card';
import SectionHeader from '../../components/ui/section-header';
import GlassCard from '../../components/ui/glass-card';
import InteractiveButton from '../(client)/interactive-button';
import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/kpi-helpers';

const actors = [
  {
    title: "Admin / Scheduler",
    description: "Mengelola order dan shipment melalui Google Sheets dengan interface familiar. Input data order, jadwal muat, dan informasi vendor.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="17" x2="11" y2="17"/>
      </svg>
    )
  },
  {
    title: "Security / Gate",
    description: "Melakukan scan QR code untuk gate_in dan gate_out. Memastikan keamanan dan validasi kendaraan masuk/keluar area.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" ry="2"/>
        <circle cx="12" cy="16" r="1"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    )
  },
  {
    title: "Driver / Operator",
    description: "Menerima informasi loading dan melakukan konfirmasi load_start serta load_finish melalui mobile interface.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9l9-7 9 7v11a2 2 0 01-2 2H4a2 2 0 01-2-2z"/>
        <polyline points="8,12 12,16 16,12"/>
      </svg>
    )
  },
  {
    title: "Manajemen / Supervisor",
    description: "Monitoring real-time melalui dashboard KPI. Mengambil keputusan berbasis data dan analisis performa harian.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )
  },
  {
    title: "Warehouse Team",
    description: "Mengelola stok dan memastikan ketersediaan produk untuk setiap shipment. Update status melalui sistem.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    )
  },
  {
    title: "IT / System Admin",
    description: "Mengelola integrasi sistem, memastikan data flow berjalan lancar antara Google Sheets, Supabase, dan API.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    )
  }
];

const workflowSteps = [
  {
    step: 1,
    title: "Input Data di Google Sheets",
    description: "Admin mengisi order, shipment, dan jadwal muat di Sheet dengan FormCode unik",
    color: "#FFD700"
  },
  {
    step: 2,
    title: "Auto Sync ke Supabase",
    description: "Apps Script berjalan setiap jam untuk sync data dari Sheet ke database Supabase",
    color: "#FFA500"
  },
  {
    step: 3,
    title: "Real-time Event Scan",
    description: "Security, driver, dan ops melakukan scan QR untuk update status di lapangan",
    color: "#FF8C00"
  },
  {
    step: 4,
    title: "Dashboard & Analytics",
    description: "Manajemen melihat KPI real-time dan mengambil keputusan berbasis data",
    color: "#FFD700"
  }
];

export default function ModulXPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [kpi, setKpi] = useState<{ gate_in: number; scans: number } | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/analytics/overview', { cache: 'no-store' });
        const json = await res.json();
        if (json?.ok && json?.kpi) {
          setKpi({ gate_in: json.kpi.gate_in ?? 0, scans: json.kpi.scans ?? 0 });
        }
      } catch {}
    };
    load();
  }, []);

  // KPI yang digunakan dari response `/api/analytics/overview`:
  // - `kpi.gate_in` (jumlah gate in mingguan)
  // - `kpi.scans` (total scan mingguan)
  // Modul-X membaca sumber data yang sama dengan Dashboard agar konsisten.

  function KpiPanel({ kpi }: { kpi: { gate_in: number; scans: number } | null }) {
    return (
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-sm text-gray-400">Gate In Mingguan</div>
            <div className="text-xl font-semibold" style={{ color: '#FFD700' }}>
              {kpi ? formatNumber(kpi.gate_in) : '—'}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-sm text-gray-400">Total Scan Mingguan</div>
            <div className="text-xl font-semibold" style={{ color: '#FFD700' }}>
              {kpi ? formatNumber(kpi.scans) : '—'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.8))' }}>
        <div className="container mx-auto px-6 text-center">
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 700,
            color: '#FFD700',
            marginBottom: 16
          }}>
            Digital Tracking: Sistem Logistik Terintegrasi
          </h1>
          <p style={{
            fontSize: 18,
            color: '#b0b7c3',
            maxWidth: '800px',
            margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            Solusi digital end-to-end yang menghubungkan Google Sheets, Supabase, dan API scan 
            untuk tracking logistik yang akurat dan real-time.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <InteractiveButton href="#workflow" className="ui-btn ui-btn--primary ui-pressable">
              Lihat Alur Kerja
            </InteractiveButton>
            <InteractiveButton href="#actors" className="ui-btn ui-btn--outline ui-pressable">
              Pengguna Sistem
            </InteractiveButton>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20" style={{ background: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Alur Kerja Digital Tracking"
            subtitle="Proses end-to-end dari input data sampai dashboard analytics"
            align="center"
          />

          <div className="max-w-4xl mx-auto">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="mb-8">
                <div 
                  className="flex items-center gap-6 p-6 rounded-xl cursor-pointer transition-all duration-300"
                  style={{
                    background: activeStep === index ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${activeStep === index ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)'}`,
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={() => setActiveStep(index)}
                >
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: step.color,
                    color: '#000',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 24,
                    flexShrink: 0
                  }}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h3 style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#FFD700',
                      marginBottom: 8
                    }}>
                      {step.title}
                    </h3>
                    <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                      {step.description}
                    </p>
                  </div>
                  <div style={{
                    transform: activeStep === index ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    color: '#FFD700'
                  }}>
                    ▶
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actors Section */}
      <section id="actors" className="py-20" style={{ background: 'rgba(0, 0, 0, 0.9)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Pengguna Sistem Digital Tracking"
            subtitle="Setiap aktor memiliki peran dan akses yang berbeda dalam ekosistem logistik"
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {actors.map((actor, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: 16,
                padding: 24,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'pointer'
              }}
              className="hover:scale-105">
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.2)',
                  color: '#FFD700',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 16
                }}>
                  {actor.icon}
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#FFD700',
                  marginBottom: 12
                }}>
                  {actor.title}
                </h3>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  {actor.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="py-20" style={{ background: 'rgba(26, 26, 26, 0.95)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Arsitektur Teknis"
            subtitle="Integrasi seamless antara platform yang berbeda"
            align="center"
          />

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 215, 0, 0.2)',
            borderRadius: 16,
            padding: 32
          }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(52, 168, 83, 0.2)',
                  color: '#34A853',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  fontSize: 32
                }}>
                  📊
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#FFD700',
                  marginBottom: 12
                }}>
                  Google Sheets
                </h3>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Interface familiar untuk input data order dan shipment. Otomatis sync ke Supabase setiap jam.
                </p>
              </div>

              <div className="text-center">
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#3B82F6',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  fontSize: 32
                }}>
                  🗄️
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#FFD700',
                  marginBottom: 12
                }}>
                  Supabase
                </h3>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  Database PostgreSQL sebagai single source of truth dengan PostgREST API untuk akses data.
                </p>
              </div>

              <div className="text-center">
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#F59E0B',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                  fontSize: 32
                }}>
                  📱
                </div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#FFD700',
                  marginBottom: 12
                }}>
                  API Scan
                </h3>
                <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                  REST API untuk menerima event scan dari lapangan dengan autentikasi token-based.
                </p>
              </div>
            </div>

            <div style={{
              marginTop: 32,
              paddingTop: 32,
              borderTop: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <h4 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#FFD700',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                Data Flow
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                flexWrap: 'wrap',
                color: '#b0b7c3'
              }}>
                <span>Google Sheets</span>
                <span style={{ color: '#FFD700' }}>→</span>
                <span>Apps Script</span>
                <span style={{ color: '#FFD700' }}>→</span>
                <span>Supabase</span>
                <span style={{ color: '#FFD700' }}>→</span>
                <span>Next.js API</span>
                <span style={{ color: '#FFD700' }}>→</span>
                <span>Dashboard</span>
              </div>
              <KpiPanel kpi={kpi} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 0, 0, 0.8))' }}>
        <div className="container mx-auto px-6 text-center">
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            color: '#FFD700',
            marginBottom: 16
          }}>
            Siap Meningkatkan Efisiensi Logistik?
          </h2>
            <p style={{
              fontSize: 18,
              color: '#b0b7c3',
              maxWidth: '700px',
              margin: '0 auto 32px',
              lineHeight: 1.6
            }}>
              Hubungi tim kami untuk implementasi Digital Tracking di perusahaan Anda
            </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <InteractiveButton href="/dashboard" className="ui-btn ui-btn--primary ui-pressable">
              Lihat Dashboard Demo
            </InteractiveButton>
            <InteractiveButton href="mailto:sales@ptmmm.co" className="ui-btn ui-btn--outline ui-pressable">
              Konsultasi Implementasi
            </InteractiveButton>
          </div>
        </div>
      </section>

      {/* GlassCard Component Demo */}
      <section className="py-20" style={{ background: 'rgba(0, 0, 0, 0.9)' }}>
        <div className="container mx-auto px-6">
          <SectionHeader 
            title="Contoh Komponen GlassCard"
            subtitle="Demonstrasi penggunaan komponen GlassCard yang reusable"
            align="center"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <GlassCard>
              <h3 style={{ color: '#FFD700', marginBottom: 12 }}>Card Default</h3>
              <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                GlassCard dengan padding medium default, cocok untuk konten umum.
              </p>
            </GlassCard>
            
            <GlassCard padding="sm">
              <h3 style={{ color: '#FFD700', marginBottom: 8 }}>Small Padding</h3>
              <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                GlassCard dengan padding kecil untuk konten ringkas.
              </p>
            </GlassCard>
            
            <GlassCard padding="lg">
              <h3 style={{ color: '#FFD700', marginBottom: 16 }}>Large Padding</h3>
              <p style={{ color: '#b0b7c3', lineHeight: 1.6 }}>
                GlassCard dengan padding besar untuk konten yang lebih kompleks.
              </p>
              <div style={{ marginTop: 16 }}>
                <InteractiveButton href="/dashboard" className="ui-btn ui-btn--primary ui-pressable">
                  Contoh Button
                </InteractiveButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>
    </AppShell>
  );
}