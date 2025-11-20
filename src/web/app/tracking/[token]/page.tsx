/**
 * Tracking Page - PT Mitramulia Makmur
 * 
 * Testing Scenarios:
 * 1. Test tracking dengan token DEMO-TRACK-001
 * 2. Verifikasi timeline event muncul lengkap (5 events)
 * 3. Check status shipment: "In Transit"
 * 4. Verifikasi customer info: PT Demo Logistik
 * 5. Test tracking dengan token tidak valid
 * 6. Verifikasi error handling untuk token salah
 * 7. Test responsive layout di mobile
 * 8. Verifikasi format tanggal & waktu
 * 9. Check progress bar status
 * 10. Test tombol kembali ke dashboard
 * 
 * Demo Data: DEMO-TRACK-001 (PT Demo Logistik, Surabaya → Jakarta)
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import GlassCard from '@/components/ui/glass-card';
import SectionHeader from '@/components/ui/section-header';

/**
 * Event → Aktor operasional (untuk konteks UI):
 * - gate_in / gate_out: Security/Gate
 * - load_start / load_finish: Ops/Warehouse
 * - pod: Driver/Operator (menandai Delivered)
 * - scan: IoT/manual checkpoint
 */
interface TrackingEvent {
  id: string;
  event_type: 'gate_in' | 'load_start' | 'load_finish' | 'gate_out' | 'pod' | 'scan';
  event_time: string;
  location: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
}

/**
 * Shape data mengikuti kontrak API: { ok: true, data }
 * Status akhir: 'Delivered' jika last event = pod, selain itu 'In Transit'.
 */
interface TrackingData {
  token: string;
  shipment_id: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  events: TrackingEvent[];
  estimated_delivery: string | null;
}

const formatDateTimeLocal = (dateTime: string): string => {
  if (!dateTime) return 'Menunggu...';
  const date = new Date(dateTime);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'gate_in':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'load_start':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    case 'load_finish':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'gate_out':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    case 'pod':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

type TimelineEvent = TrackingEvent;

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  return (
    <div className="relative flex items-start">
      <div
        className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${
          event.status === 'completed'
            ? 'bg-[#FFD700] border-[#FFD700] text-black'
            : event.status === 'in_progress'
            ? 'bg-yellow-500 border-yellow-500 text-white'
            : 'bg-gray-600 border-gray-600 text-white'
        }`}
      >
        {getEventIcon(event.event_type)}
      </div>
      <div className="ml-6 flex-1">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">{event.description || '—'}</h3>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 sm:mt-0 ${
                event.status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : event.status === 'in_progress'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {event.status === 'completed'
                ? 'Selesai'
                : event.status === 'in_progress'
                ? 'Sedang Berlangsung'
                : 'Menunggu'}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">
              <span className="font-medium">Lokasi:</span> {event.location || '—'}
            </p>
            <p className="text-gray-400">
              <span className="font-medium">Waktu:</span> {formatDateTimeLocal(event.event_time)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tracking/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!json?.ok || !json?.data) {
          setError('Token tracking tidak ditemukan');
          return;
        }
        setTrackingData(json.data);
      } catch (err) {
        setError('Gagal memuat data tracking');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchTrackingData();
    }
  }, [token]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#FFD700] border-t-transparent mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Memuat Data Tracking</h2>
              <p className="text-gray-400">Mohon tunggu sebentar...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !trackingData) {
    return (
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-block p-4 bg-red-500/20 rounded-full mb-4">
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Token Tidak Valid</h2>
              <p className="text-gray-400 mb-6">{error || 'Token tracking yang Anda masukkan tidak ditemukan dalam sistem kami.'}</p>
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#FFD700]/25 transition-all duration-300"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Tracking Pengiriman" align="center" />
          <div className="text-center mb-8">
            <p className="text-xl text-[#FFD700] font-semibold">{trackingData.shipment_id ?? ''}</p>
          </div>

          <GlassCard padding="md" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Customer</h3>
                <p className="text-white font-semibold">{trackingData.customer_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Asal</h3>
                <p className="text-white font-semibold">{trackingData.origin}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Tujuan</h3>
                <p className="text-white font-semibold">{trackingData.destination}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Estimasi</h3>
                <p className="text-white font-semibold">{trackingData.estimated_delivery ? new Date(trackingData.estimated_delivery).toLocaleDateString('id-ID') : '-'}</p>
              </div>
            </div>
          </GlassCard>

          {/* Status Badge */}
          <div className="text-center mb-8">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              trackingData.status === 'Delivered' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {trackingData.status === 'Delivered' ? 'Terkirim' : 'Dalam Perjalanan'}
            </span>
          </div>

          <GlassCard padding="lg">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Timeline Pengiriman</h2>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500]"></div>
              <div className="space-y-8">
                {trackingData.events.map((event) => (
                  <TimelineEventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak
            </button>
            
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#FFD700]/25 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}