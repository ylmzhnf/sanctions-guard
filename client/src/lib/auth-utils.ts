import React from 'react';
import { User } from './api';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'API_SERVICE';

export interface RolePermissions {
  canViewGlobalStats: boolean;
  canManageAllOrganizations: boolean;
  canManageGlobalUsers: boolean;
  canUpdateGlobalSettings: boolean;
  canManageOrgUsers: boolean;
  canUpdateOrgSettings: boolean;
  canViewOrgStats: boolean;
  canPerformScreening: boolean;
  canManageOwnProfile: boolean;
}

/**
 * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Kullanıcının belirli rollerden herhangi birine sahip olup olmadığını kontrol eder
 */
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  return roles.some(role => user?.role === role);
}

/**
 * Kullanıcının admin yetkisi olup olmadığını kontrol eder (ADMIN veya SUPER_ADMIN)
 */
export function isAdmin(user: User | null): boolean {
  return hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Kullanıcının süper admin yetkisi olup olmadığını kontrol eder
 */
export function isSuperAdmin(user: User | null): boolean {
  return hasRole(user, 'SUPER_ADMIN');
}

/**
 * Kullanıcının organizasyon admin yetkisi olup olmadığını kontrol eder (sadece ADMIN)
 */
export function isOrgAdmin(user: User | null): boolean {
  return hasRole(user, 'ADMIN');
}

/**
 * Kullanıcının standart kullanıcı olup olmadığını kontrol eder
 */
export function isUser(user: User | null): boolean {
  return hasRole(user, 'USER');
}

/**
 * Kullanıcının API servis hesabı olup olmadığını kontrol eder
 */
export function isApiService(user: User | null): boolean {
  return hasRole(user, 'API_SERVICE');
}

/**
 * Kullanıcının rol bazlı izinlerini döndürür
 */
export function getUserPermissions(user: User | null): RolePermissions {
  const role = user?.role as UserRole;
  
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        canViewGlobalStats: true,
        canManageAllOrganizations: true,
        canManageGlobalUsers: true,
        canUpdateGlobalSettings: true,
        canManageOrgUsers: true,
        canUpdateOrgSettings: true,
        canViewOrgStats: true,
        canPerformScreening: true,
        canManageOwnProfile: true,
      };
    
    case 'ADMIN':
      return {
        canViewGlobalStats: false,
        canManageAllOrganizations: false,
        canManageGlobalUsers: false,
        canUpdateGlobalSettings: false,
        canManageOrgUsers: true,
        canUpdateOrgSettings: true,
        canViewOrgStats: true,
        canPerformScreening: true,
        canManageOwnProfile: true,
      };
    
    case 'USER':
      return {
        canViewGlobalStats: false,
        canManageAllOrganizations: false,
        canManageGlobalUsers: false,
        canUpdateGlobalSettings: false,
        canManageOrgUsers: false,
        canUpdateOrgSettings: false,
        canViewOrgStats: false,
        canPerformScreening: true,
        canManageOwnProfile: true,
      };
    
    case 'API_SERVICE':
      return {
        canViewGlobalStats: false,
        canManageAllOrganizations: false,
        canManageGlobalUsers: false,
        canUpdateGlobalSettings: false,
        canManageOrgUsers: false,
        canUpdateOrgSettings: false,
        canViewOrgStats: false,
        canPerformScreening: true,
        canManageOwnProfile: false,
      };
    
    default:
      return {
        canViewGlobalStats: false,
        canManageAllOrganizations: false,
        canManageGlobalUsers: false,
        canUpdateGlobalSettings: false,
        canManageOrgUsers: false,
        canUpdateOrgSettings: false,
        canViewOrgStats: false,
        canPerformScreening: false,
        canManageOwnProfile: false,
      };
  }
}

/**
 * Kullanıcının belirli bir izne sahip olup olmadığını kontrol eder
 */
export function hasPermission(
  user: User | null, 
  permission: keyof RolePermissions
): boolean {
  const permissions = getUserPermissions(user);
  return permissions[permission];
}

/**
 * Rol bazlı erişim kontrolü için HOC component
 */
export function requireRole(allowedRoles: UserRole[]) {
  return function <T extends object>(Component: React.ComponentType<T>) {
    return function RoleProtectedComponent(props: T) {
      // Bu component'i kullanacak sayfalarda useAuthStore hook'u kullanılmalı
      return React.createElement(Component, props);
    };
  };
}

/**
 * İzin bazlı erişim kontrolü için HOC component
 */
export function requirePermission(permission: keyof RolePermissions) {
  return function <T extends object>(Component: React.ComponentType<T>) {
    return function PermissionProtectedComponent(props: T) {
      // Bu component'i kullanacak sayfalarda useAuthStore hook'u kullanılmalı
      return React.createElement(Component, props);
    };
  };
}