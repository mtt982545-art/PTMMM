/**
 * Login Page - PT Mitramulia Makmur Digital Tracking
 * 
 * Testing Scenarios:
 * 1. Login dengan email admin1@ptmmm.co + password benar → redirect ke /admin
 * 2. Login dengan email marketing1@ptmmm.co + password benar → redirect ke /marketing/dashboard  
 * 3. Login dengan email ops1@ptmmm.co + password benar → redirect ke /ops/dashboard
 * 4. Login dengan email security1@ptmmm.co + password benar → redirect ke /security/gate
 * 5. Login dengan email driver1@ptmmm.co + password benar → redirect ke /driver/home
 * 6. Login dengan password salah → toast error 'Login gagal'
 * 7. Login dengan email tidak terdaftar → toast error 'User tidak ditemukan'
 * 8. Login dengan email kosong → form validation error 'Email tidak valid'
 * 9. Login dengan password < 8 karakter → form validation error 'Minimal 8 karakter'
 * 10. Login dari halaman /tracking dengan redirect param → redirect ke /tracking setelah sukses
 * 11. Login user tanpa role → toast warning 'Role belum ditetapkan' + redirect ke dashboard
 * 12. Error network saat login → toast error 'Terjadi kesalahan saat login'
 * 13. Klik tombol "Lupa password" → email client terbuka dengan subject 'Reset Password PT.MMM'
 * 14. Klik tombol "Hubungi Admin" → email client terbuka ke helpdesk@ptmmm.co
 * 15. Loading state saat submit → tombol menunjukkan 'Memproses…'
 */

'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Toaster, toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { loginWithPassword } from '../../lib/auth/client-auth';
import { getClientRoleRedirect } from '../../lib/auth/client-helpers';
import type { AppRole } from '../../lib/types';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Minimal 8 karakter'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectParam = search.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const exists = /(?:^|;\s*)csrf_token=/.test(document.cookie)
      if (!exists) {
        let token = ''
        try {
          const buf = new Uint8Array(16)
          crypto.getRandomValues(buf)
          token = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
        } catch {
          token = Math.random().toString(36).slice(2)
        }
        const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `csrf_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`
      }
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onSubmit' });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      
      const result = await loginWithPassword(values.email, values.password);
      
      if (!result.success) {
        const errorMessage = result.message.toLowerCase();
        
        if (errorMessage.includes('invalid login credentials') || errorMessage.includes('password')) {
          toast.error('Email atau password salah');
        } else if (errorMessage.includes('user not found') || errorMessage.includes('user tidak ditemukan')) {
          toast.error('User tidak ditemukan');
        } else if (errorMessage.includes('email not confirmed')) {
          toast.error('Email belum dikonfirmasi');
        } else if (errorMessage.includes('too many requests')) {
          toast.error('Terlalu banyak percobaan. Coba lagi dalam 1 menit');
        } else {
          toast.error(result.message);
        }
        return;
      }
      
      toast.success('Login berhasil');
      
      const isSafeRelativePath = (p: string) => /^\/(?!\/)[\w\-\/.?=&%]*$/.test(p);
      const safeRedirect = (p?: string | null) => (p && isSafeRelativePath(p) ? p : null);

      if (!result.role) {
        toast.info('Akun Anda belum memiliki role, diarahkan ke dashboard umum.');
        const destNullRole = safeRedirect((result as any).redirect) ?? safeRedirect(redirectParam) ?? '/dashboard';
        router.push(destNullRole);
        return;
      }
      
      const preferApiRedirect = safeRedirect((result as any).redirect);
      const roleRedirect = getClientRoleRedirect(result.role, '/dashboard');
      const finalRedirect = preferApiRedirect ?? roleRedirect ?? safeRedirect(redirectParam) ?? '/dashboard';
      router.push(finalRedirect);
      
    } catch (e: any) {
      const errorMessage = e.message?.toLowerCase() || '';
      
      if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
        toast.error('Koneksi internet bermasalah');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Request timeout - coba lagi');
      } else if (errorMessage.includes('offline')) {
        toast.error('Anda sedang offline');
      } else {
        toast.error('Terjadi kesalahan saat login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-sm p-8" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 215, 0, 0.2)', borderRadius: 16 }}>
      <Toaster richColors position="top-center" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: '#FFD700' }}>Masuk</h1>
        <p className="text-sm" style={{ color: '#b0b7c3' }}>Akses sistem WMS PT.MMM</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@ptmmm.co" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" aria-invalid={!!errors.password} {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <a className="hover:underline" style={{ color: '#FFD700' }} href="mailto:helpdesk@ptmmm.co?subject=Reset%20Password%20PT.MMM">Lupa password?</a>
        <a className="hover:underline" style={{ color: '#b0b7c3' }} href="mailto:helpdesk@ptmmm.co">Hubungi Admin</a>
      </div>
    </main>
  );
}
