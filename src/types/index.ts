// Shared domain & API types for the MAH Agent portal.
//
// The backend (MAH-BE) returns loosely-shaped JSON: almost every response is
// `{ status: boolean, ... }` and populated documents vary by endpoint. These
// types describe the fields the frontend actually reads, and keep most of them
// optional so `strict` mode passes without rewriting the runtime logic.

export type KycStatus = "pending" | "under_review" | "approved" | "rejected";
export type AgentLevel = "basic" | "silver" | "gold" | "diamond";
export type ClientStatus = "pending" | "active" | "suspended" | "blocked" | "closed";
export type Gender = "male" | "female" | "other";

// ─── KYC verification sub-document ───────────────────────────────────────────
export interface KycVerification {
  liveSelfie?: string;
  selfDeclarationVideo?: string;
  governmentIdFront?: string;
  governmentIdBack?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  remarks?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: { fullName?: string; email?: string } | null;
}

// ─── Agent (the logged-in user) ─────────────────────────────────────────────
export interface Agent {
  _id: string;
  agentId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: Gender | string;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  preferredCurrency?: string;
  profileImage?: string;
  referralCode?: string;
  agentLevel?: AgentLevel | string;
  kycStatus?: KycStatus | string;
  kycVerification?: KycVerification;
  joiningDate?: string;
  commissionPercentage?: number;
  availableCommissionBalance?: number;
  pendingCommission?: number;
  totalCommissionEarned?: number;
  totalCommissionPaid?: number;
  totalClients?: number;
  activeClients?: number;
  totalInvestmentVolume?: number;
  salaryActivated?: boolean;
  isSalaryEligibleThisMonth?: boolean;
  salesThisMonth?: number;
}

// ─── Client (referred investor) ────────────────────────────────────────────
export interface Client {
  _id: string;
  clientId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: Gender | string;
  countryCode?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  preferredCurrency?: string;
  profileImage?: string;
  status?: ClientStatus | string;
  kycStatus?: KycStatus | string;
  kycVerification?: KycVerification;
  isKycRequired?: boolean;
  riskProfile?: "conservative" | "moderate" | "aggressive" | string;
  notes?: string;
  portfolioValue?: number;
  totalProfitEarned?: number;
  availableBalance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  createdAt?: string;
}

// ─── Investment plan ───────────────────────────────────────────────────────
export interface InvestmentPlan {
  _id: string;
  name: string;
  category: string;
  shortDescription?: string;
  riskLevel?: string;
  roiType?: "fixed" | "range" | string;
  roiMin?: number;
  roiMax?: number;
  minAmount?: number;
  currency?: string;
  payoutType?: string;
}

// ─── Wallet / payout destination ───────────────────────────────────────────
export interface Wallet {
  _id: string;
  network?: string;
  walletAddress?: string;
  label?: string;
  isPrimary?: boolean;
}

// Fund-balance ledger wallet (from /transactions/admin/fund-balances)
export interface LedgerWallet {
  _id: string;
  currency?: string;
  balance?: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
}

// ─── Bank detail ───────────────────────────────────────────────────────────
export interface BankDetail {
  _id: string;
  bankName?: string;
  branchName?: string;
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  swiftCode?: string;
  isPrimary?: boolean;
}

// ─── Withdrawal request ────────────────────────────────────────────────────
export interface Withdrawal {
  _id: string;
  amount: number;
  currency?: string;
  status: "pending" | "approved" | "rejected" | string;
  withdrawalMethod?: "wallet" | "bank" | string;
  walletId?: { network?: string; label?: string } | null;
  bankDetailId?: { bankName?: string } | null;
  createdAt?: string;
}

// ─── Transaction ───────────────────────────────────────────────────────────
export interface ClientTransaction {
  _id: string;
  type?: string;
  amount?: number;
  currency?: string;
  status?: string;
  transactionId?: string;
  referenceId?: string;
  createdAt?: string;
}

// ─── Portfolio ─────────────────────────────────────────────────────────────
export interface Portfolio {
  _id: string;
  portfolioId?: string;
  planName?: string;
  planSnapshot?: { name?: string };
  planId?: { name?: string };
  initialAmount?: number;
  amountUsd?: number;
  maturityPayout?: number;
  roiPercentage?: number;
  roiMin?: number;
  currency?: string;
  status?: string;
}

// ─── Paginated collection (mongoose-paginate-v2 shape) ─────────────────────
export interface Paginated<T> {
  docs: T[];
  totalDocs?: number;
  limit?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

// ─── Generic API response ──────────────────────────────────────────────────
// Every backend payload carries `status`; other keys depend on the endpoint,
// so callers index into a permissive record.
export type ApiResponse<T = Record<string, unknown>> = {
  status?: boolean;
  statusCode?: number;
  message?: string;
} & T &
  Record<string, unknown>;
