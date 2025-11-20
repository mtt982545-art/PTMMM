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
import { useState } from 'react';
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onSubmit' });

  /**
   * Login flow dengan error handling presisi
   * 1. Form validation via react-hook-form + zod
   * 2. Call loginWithPassword → handle specific error cases dengan presisi
   * 3. Role-based redirect menggunakan mapping konsisten
   * 4. Fallback ke redirectParam jika role tidak valid
   * 5. Comprehensive error handling untuk UX yang optimal
   */
  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      
      // Use the new client auth utility
      const result = await loginWithPassword(values.email, values.password);
      
      if (!result.success) {
        // Handle specific error cases dengan presisi untuk UX yang baik
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
          // Fallback untuk error yang tidak dikenal
          toast.error(result.message);
        }
        return;
      }
      
      toast.success('Login berhasil');
      
      // Handle case where user has no role assigned
      if (!result.role) {
        toast.warning('Role belum ditetapkan, redirect ke dashboard');
        router.push(redirectParam);
        return;
      }
      
      // Get role-based redirect using consistent mapping
      const redirectUrl = getClientRoleRedirect(result.role, redirectParam);
      
      console.log(`Login success: ${values.email} → role: ${result.role} → redirect: ${redirectUrl}`);
      router.push(redirectUrl);
      
    } catch (e: any) {
      console.error('Login error:', e);
      
      // Handle network/server errors dengan presisi
      const errorMessage = e.message?.toLowerCase() || '';
      
      if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
        toast.error('Koneksi internet bermasalah');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Request timeout - coba lagi');
      } else if (errorMessage.includes('offline')) {
        toast.error('Anda sedang offline');
      } else {
        // Fallback untuk error yang tidak dikenal
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
