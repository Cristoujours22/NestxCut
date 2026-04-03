/*
 * File: cotizador-pro/src/models/licensing.ts
 * Purpose: Data models for licensing domain (Company, Plan, Subscription, PromoCode, LicensingInfo)
 * Author: DespieceAPP Automation
 * Created: 2026-04-03
 * Notes: Heavily commented for maintainability and future evolution.
 */

/**
 * Representa la información de la compañía asociada a una suscripción.
 */
export interface Company {
  id: string;
  name: string;
  taxId?: string;
  address?: string;
  currency?: string;
}

/**
 * Representa un plan de suscripción disponible.
 */
export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
}

export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'trial';

/**
 * Suscripción de un Company a un Plan.
 */
export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: string; // ISO date string
  trial?: boolean;
}

/**
 * Código promocional aplicable a una suscripción.
 */
export interface PromoCode {
  code: string;
  discountPct?: number;
  validUntil?: string; // ISO date string
}

/**
 * Agrupa la información de licensing para una empresa y su suscripción actual.
 */
export interface LicensingInfo {
  company: Company;
  subscription?: Subscription;
  activePromo?: PromoCode;
}

// === Example Usage ===
/*
// Create a Company instance
const myCompany: Company = {
  id: 'comp_001',
  name: 'Mi Carpintería',
  taxId: '20-12345678-9',
  address: 'Calle Falsa 123',
  currency: 'USD',
};

// Create a Plan instance
const proPlan: Plan = {
  id: 'plan_pro_monthly',
  name: 'Pro Monthly',
  price: 29.99,
  interval: 'monthly',
};

// Create a Subscription for the company
const mySubscription: Subscription = {
  id: 'sub_001',
  companyId: myCompany.id,
  planId: proPlan.id,
  status: 'active',
  currentPeriodEnd: '2026-05-01T00:00:00Z',
  trial: true,
};

// Combine into LicensingInfo
const licensingInfo: LicensingInfo = {
  company: myCompany,
  subscription: mySubscription,
  activePromo: undefined,
};

// Validate a company object (basic validation)
export function validateCompany(company: unknown): company is Company {
  if (!company || typeof company !== 'object') return false;
  const c = company as Partial<Company>;
  return typeof c.id === 'string' && typeof c.name === 'string';
}

// Validate a plan object (basic validation)
export function validatePlan(plan: unknown): plan is Plan {
  if (!plan || typeof plan !== 'object') return false;
  const p = plan as Partial<Plan>;
  return typeof p.id === 'string' && typeof p.name === 'string' && typeof p.price === 'number';
}
