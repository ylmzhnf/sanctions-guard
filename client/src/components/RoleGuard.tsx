"use client";

import { ReactNode } from 'react';
import { useAuthStore } from '@/lib/store';
import { hasAnyRole, hasPermission, UserRole, RolePermissions } from '@/lib/auth-utils';

interface RoleGuardProps {
  children: ReactNode;
  roles?: UserRole[];
  permission?: keyof RolePermissions;
  fallback?: ReactNode;
  requireAll?: boolean; // true ise tüm roller gerekli, false ise herhangi biri yeterli
}

/**
 * Rol bazlı erişim kontrolü için component
 * Kullanıcının belirtilen rollere veya izinlere sahip olup olmadığını kontrol eder
 */
export function RoleGuard({ 
  children, 
  roles, 
  permission, 
  fallback = null,
  requireAll = false 
}: RoleGuardProps) {
  const { user } = useAuthStore();

  // İzin kontrolü
  if (permission) {
    const hasRequiredPermission = hasPermission(user, permission);
    if (!hasRequiredPermission) {
      return <>{fallback}</>;
    }
  }

  // Rol kontrolü
  if (roles && roles.length > 0) {
    let hasRequiredRole = false;
    
    if (requireAll) {
      // Tüm roller gerekli
      hasRequiredRole = roles.every(role => user?.role === role);
    } else {
      // Herhangi bir rol yeterli
      hasRequiredRole = hasAnyRole(user, roles);
    }
    
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Erişim reddedildi mesajı için standart component
 */
export function AccessDenied({ 
  title = "Erişim Reddedildi",
  message = "Bu sayfaya erişim yetkiniz bulunmamaktadır.",
  requiredRole 
}: {
  title?: string;
  message?: string;
  requiredRole?: string;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-12">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
        <div className="w-24 h-24 bg-card border border-destructive/30 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
          <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-7a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <h2 className="text-4xl font-black tracking-tighter italic">
        {title.split(' ')[0]} <span className="text-destructive not-italic">{title.split(' ').slice(1).join(' ')}</span>
      </h2>
      <p className="text-muted-foreground text-sm mt-3 max-w-sm font-medium leading-relaxed">
        {message}
        {requiredRole && (
          <>
            {' '}Bu işlem için <span className="font-bold text-foreground">{requiredRole}</span> yetkisi gereklidir.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Süper admin erişimi için özel component
 */
export function SuperAdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard 
      roles={['SUPER_ADMIN']} 
      fallback={fallback || <AccessDenied requiredRole="SUPER_ADMIN" />}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * Admin erişimi için özel component (ADMIN veya SUPER_ADMIN)
 */
export function AdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard 
      roles={['ADMIN', 'SUPER_ADMIN']} 
      fallback={fallback || <AccessDenied requiredRole="ADMIN" />}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * Organizasyon admin erişimi için özel component (sadece ADMIN)
 */
export function OrgAdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard 
      roles={['ADMIN']} 
      fallback={fallback || <AccessDenied requiredRole="ADMIN" />}
    >
      {children}
    </RoleGuard>
  );
}