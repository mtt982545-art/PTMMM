/**
 * AppShell - Global Layout Component untuk PT Mitramulia Makmur Digital Tracking
 * 
 * ARSITEKTUR NAVIGASI ROLE-BASED:
 * 
 * 1. User State Management:
 *    - User | null dari Supabase auth
 *    - Loading state untuk prevent flash
 *    - Error handling dengan try/catch
 * 
 * 2. Role Detection Flow:
 *    - extractRoleFromEmail(email) → AppRole | null
 *    - getRoleNavigation(role) → NavigationItem[]
 *    - Role-based menu items sesuai permissions
 * 
 * 3. Navigation Structure per Role:
 *    Admin    : Dashboard + Admin Dashboard
 *    Marketing: Dashboard + Marketing Dashboard  
 *    Ops      : Dashboard + Ops Dashboard + Scan Event
 *    Security : Dashboard + Gate Monitor + Scan Event
 *    Driver   : Dashboard Driver + Tracking Saya (personalized)
 *    No Role  : Dashboard (demo mode)
 * 
 * 4. Auth Actions:
 *    - Logout: clear session → toast → redirect → refresh
 *    - Login: redirect ke login page
 * 
 * TESTING SCENARIOS (TESTING_CHECKLIST.md):
 * ➜ admin1@ptmmm.co     → Nav: Dashboard, Admin Dashboard
 * ➜ marketing1@ptmmm.co → Nav: Dashboard, Marketing Dashboard
 * ➜ ops1@ptmmm.co       → Nav: Dashboard, Ops Dashboard, Scan Event
 * ➜ security1@ptmmm.co  → Nav: Dashboard, Gate Monitor, Scan Event
 * ➜ driver1@ptmmm.co    → Nav: Dashboard Driver, Tracking Saya
 * ➜ No login            → Nav: Dashboard (public)
 * 
 * BRANDING CONSISTENCY:
 * - PT Mitramulia Makmur (header & footer)
 * - Digital Tracking (navigation)
 * - Gold color scheme (#FFD700)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import InteractiveButton from '../../app/(client)/interactive-button';
import { logout, getCurrentUser } from '../../lib/auth/client-auth';
import { extractRoleFromEmail } from '../../lib/auth/client-helpers';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { AppRole } from '../../lib/types';
import { 
  getCombinedNavigation, 
  getRoleQuickActions, 
  isActiveNavigation,
  getRoleDisplayName 
} from '../../lib/navigation-helpers';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  /**
   * Consolidated navigation using centralized helpers
   * Replaces manual role mapping with type-safe helper functions
   */
  const userRole = user?.email ? extractRoleFromEmail(user.email) as AppRole | null : null;
  const navigation = getCombinedNavigation(userRole, user?.email || undefined);

  /**
   * User state management flow
   * 1. Check session on mount → getCurrentUser() → setUser(User | null)
   * 2. Loading state untuk prevent flash of content
   * 3. Error handling dengan console.error untuk debugging
   */
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    try { setIsDemo(typeof document !== 'undefined' && document.cookie.includes('demo_mode=1')) } catch {}
  }, []);

  useEffect(() => {
    try { setIsDemo(typeof document !== 'undefined' && document.cookie.includes('demo_mode=1')) } catch {}
  }, [pathname]);

  /**
   * Logout flow
   * 1. Call logout() → clear session cookies
   * 2. Show success toast → user feedback
   * 3. Redirect to /login → ensure clean state
   * 4. router.refresh() → clear client cache
   * 5. Error handling dengan user-friendly message
   */
  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        try { await fetch('/api/demo-logout', { method: 'POST' }) } catch {}
        toast.success('Logout berhasil');
        router.push('/login');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat logout');
    }
  };

  const handleDemoLogin = async () => {
    try {
      const resp = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@example.com', password: 'Demo123' })
      })
      const json = await resp.json()
      if (resp.ok && json.ok) {
        toast.success('Masuk sebagai Akun Demo')
        router.push('/dashboard')
        router.refresh()
      } else {
        toast.error(json.message || 'Gagal login demo')
      }
    } catch {
      toast.error('Terjadi kesalahan saat login demo')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ 
        borderColor: 'rgba(255, 215, 0, 0.2)', 
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="container mx-auto px-6 py-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img
              src="/brand/logosa.png"
              alt="PT MMM Logo"
              loading="lazy"
              decoding="async"
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#FFD700', fontSize: 16 }}>PT Mitramulia Makmur</div>
              <div style={{ fontSize: 12, color: '#b0b7c3' }}>Premium Packaging Solutions</div>
            </div>
          </Link>
          
          <nav role="navigation" aria-label="Navigasi utama" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {navigation.map((item) => {
              const isActive = isActiveNavigation(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    color: isActive ? '#FFD700' : '#b0b7c3',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    borderBottom: isActive ? '2px solid #FFD700' : 'none',
                    paddingBottom: '4px'
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
            {!user && (
              <InteractiveButton href="/dashboard" className="ui-btn ui-btn--primary ui-pressable">
                Dashboard
              </InteractiveButton>
            )}
            {!user && (
              <button
                onClick={handleDemoLogin}
                className="ui-btn ui-btn--outline ui-pressable"
                style={{ border: '1px solid #FFD700', color: '#FFD700', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                Akun Demo
              </button>
            )}
          </nav>
          
          {/* User Menu */}
          {!loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {user && (
                <>
                  <span style={{ color: '#b0b7c3', fontSize: 14 }}>
                    {getRoleDisplayName(userRole)} - {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="ui-btn ui-btn--outline"
                    style={{
                      background: 'transparent',
                      border: '1px solid #FFD700',
                      color: '#FFD700',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
              {!user && (
                <InteractiveButton href="/login" className="ui-btn ui-btn--primary ui-pressable">
                  Login
                </InteractiveButton>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main id="main" role="main">
        {children}
        {/* Toast container for auth messages */}
        <div id="auth-toast-container" />
        {isDemo && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-20deg)', fontSize: 64, fontWeight: 800, color: 'rgba(255, 215, 0, 0.12)', letterSpacing: 8, textTransform: 'uppercase' }}>
              AKUN DEMO
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        background: 'rgba(0, 0, 0, 0.9)', 
        color: '#b0b7c3', 
        padding: '48px 0',
        borderTop: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, textDecoration: 'none' }}>
                <img
                  src="/brand/logosa.png"
                  alt="PT MMM Logo"
                  loading="lazy"
                  decoding="async"
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#FFD700' }}>PT Mitramulia Makmur</div>
                  <div style={{ fontSize: 12 }}>Premium Packaging Solutions</div>
                </div>
              </Link>
              <p style={{ lineHeight: 1.6 }}>
                Produsen kemasan plastik dan kaleng cat premium dengan sistem logistik digital 
                terintegrasi untuk mendukung efisiensi operasional bisnis Anda.
              </p>
            </div>
            
            <div>
              <h4 style={{ color: '#FFD700', fontWeight: 600, marginBottom: 12 }}>Solusi</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: 8 }}><Link href="/modul-x" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Digital Tracking</Link></li>
                <li style={{ marginBottom: 8 }}><Link href="/tentang" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Kemasan Plastik</Link></li>
                <li style={{ marginBottom: 8 }}><Link href="/tentang" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Kaleng Cat</Link></li>
                <li><Link href="/tracking/DEMO-TRACK-001" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Tracking Pengiriman</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 style={{ color: '#FFD700', fontWeight: 600, marginBottom: 12 }}>Perusahaan</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: 8 }}><Link href="/tentang" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Tentang Kami</Link></li>
                <li style={{ marginBottom: 8 }}><Link href="/tentang" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Lokasi</Link></li>
                <li style={{ marginBottom: 8 }}><Link href="/tentang" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Kontak</Link></li>
                <li><Link href="/tracking/DEMO-TRACK-001" style={{ color: '#b0b7c3', textDecoration: 'none' }}>Tracking</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 style={{ color: '#FFD700', fontWeight: 600, marginBottom: 12 }}>Kontak</h4>
              <div style={{ lineHeight: 1.6 }}>
                <p style={{ marginBottom: 8 }}>📧 sales@ptmmm.co</p>
                <p style={{ marginBottom: 8 }}>📞 +62 31 0000 0000</p>
                <p style={{ marginBottom: 8 }}>📍 Sidoarjo, Jawa Timur</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <a href="#" style={{ color: '#FFD700' }}>LinkedIn</a>
                  <a href="#" style={{ color: '#FFD700' }}>Instagram</a>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            borderTop: '1px solid rgba(255, 215, 0, 0.2)', 
            marginTop: 32, 
            paddingTop: 24,
            textAlign: 'center'
          }}>
            <p>© {new Date().getFullYear()} PT Mitramulia Makmur. Semua hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}