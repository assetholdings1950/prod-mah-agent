// Commission Tiers (SIP) — display source of truth for the agent portal.
//
// Agent commission on a SIP (monthly) sale is set by the *amount* of that
// individual sale. This table mirrors prod-mah-be/config/commissionTiers.js —
// keep the two in sync when editing. The dashboard renders its
// "Commission Tiers (SIP)" panel straight from this array.

import type { AgentLevel } from "@/types";

export interface SipCommissionTier {
  level: AgentLevel;
  label: string;
  /** Inclusive lower bound in USD. */
  min: number;
  /** Inclusive upper bound in USD, or null for "no upper bound". */
  max: number | null;
  /** Commission rate as a percentage. */
  rate: number;
}

// Ordered ascending by `min`.
export const SIP_COMMISSION_TIERS: SipCommissionTier[] = [
  { level: "basic", label: "Basic Partner", min: 0, max: 5000, rate: 2 },
  { level: "silver", label: "Silver Partner", min: 5000.01, max: 10000, rate: 5 },
  { level: "gold", label: "Gold Partner", min: 10000.01, max: 25000, rate: 7.5 },
  { level: "diamond", label: "Diamond Partner", min: 25000.01, max: null, rate: 10 },
];

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/** Human-readable amount band for a tier, e.g. "≤ $5,000" or "$5,001 – $10,000". */
export function tierRangeLabel(tier: SipCommissionTier): string {
  if (tier.min <= 0 && tier.max !== null) return `≤ ${usd(tier.max)}`;
  if (tier.max === null) return `> ${usd(Math.floor(tier.min))}`;
  return `${usd(Math.ceil(tier.min))} – ${usd(tier.max)}`;
}

/** Resolve the SIP tier for a given sale amount. */
export function resolveSipTier(amount: number): SipCommissionTier {
  const value = Number(amount) || 0;
  for (const tier of SIP_COMMISSION_TIERS) {
    if (value >= tier.min && (tier.max === null || value <= tier.max)) return tier;
  }
  return SIP_COMMISSION_TIERS[SIP_COMMISSION_TIERS.length - 1];
}
