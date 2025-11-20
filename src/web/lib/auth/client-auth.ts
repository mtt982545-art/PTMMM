/**
 * Client-side authentication utilities
 * Handles login/logout and session management for PT Mitramulia Makmur Digital Tracking
 * 
 * Testing Scenarios:
 * 1. Login dengan email admin1@ptmmm.co + password benar → success: true, role: 'admin'
 * 2. Login dengan email marketing1@ptmmm.co + password benar → success: true, role: 'marketing'
 * 3. Login dengan email ops1@ptmmm.co + password benar → success: true, role: 'ops'
 * 4. Login dengan email security1@ptmmm.co + password benar → success: true, role: 'security'
 * 5. Login dengan email driver1@ptmmm.co + password benar → success: true, role: 'driver'
 * 6. Login dengan password salah → success: false, message: 'Login gagal'
 * 7. Login dengan email tidak terdaftar → success: false, message: 'User tidak ditemukan'
 * 8. Login dengan email kosong → form validation error
 * 9. Login dengan password < 8 karakter → form validation error
 * 10. Logout berhasil → success: true, session terhapus
 * 11. Get current user saat login → mengembalikan User object
 * 12. Get current session saat login → mengembalikan Session object
 * 13. Error network saat login → success: false, message: 'Terjadi kesalahan saat login'
 * 14. Error network saat logout → success: false, message: 'Terjadi kesalahan saat logout'
 * 15. API login tidak merespon → tetap handle dengan grace
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import type { AppRole } from '../types';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  role?: AppRole;
}

/**
 * Login with email and password
 */
export async function loginWithPassword(email: string, password: string): Promise<AuthResponse> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return {
        success: false,
        message: error.message || 'Login gagal',
      };
    }
    
    if (!data.user) {
      return {
        success: false,
        message: 'User tidak ditemukan',
      };
    }
    
    // Get user role
    const roleResponse = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const roleData = await roleResponse.json();
    
    return {
      success: true,
      message: 'Login berhasil',
      user: data.user,
      role: roleData.role || null,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Terjadi kesalahan saat login',
    };
  }
}

/**
 * Logout current user
 */
export async function logout(): Promise<AuthResponse> {
  try {
    const supabase = createClientComponentClient();
    
    // Call API logout to clear server-side session
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      return {
        success: false,
        message: result.message || 'Logout gagal',
      };
    }
    
    // Sign out from client
    await supabase.auth.signOut();
    
    return {
      success: true,
      message: 'Logout berhasil',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Terjadi kesalahan saat logout',
    };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}