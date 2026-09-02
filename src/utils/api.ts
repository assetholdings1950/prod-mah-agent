import type {
  Agent,
  ApiResponse,
  BankDetail,
  Client,
  ClientTransaction,
  InvestmentPlan,
  LedgerWallet,
  Paginated,
  Portfolio,
  Wallet,
  Withdrawal,
} from "@/types";

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

// Helper to get cookies
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift() ?? null;
  return null;
};

// Helper to set cookies
const setCookie = (name: string, value: string, days = 7): void => {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
};

// Helper to delete cookies
const deleteCookie = (name: string): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Lax`;
};

export interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}

// Helper to get tokens from cookies (safe for SSR)
export const getTokens = (): Tokens => {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  return {
    accessToken: getCookie("accessToken"),
    refreshToken: getCookie("refreshToken"),
  };
};

// Helper to save tokens to cookies
export const setTokens = (accessToken?: string | null, refreshToken?: string | null): void => {
  if (typeof window === "undefined") return;
  if (accessToken) setCookie("accessToken", accessToken, 1); // 1 day
  if (refreshToken) setCookie("refreshToken", refreshToken, 7); // 7 days
};

// Helper to clear tokens from cookies
export const clearTokens = (): void => {
  if (typeof window === "undefined") return;
  deleteCookie("accessToken");
  deleteCookie("refreshToken");
};

// In-memory user state cache (no localStorage)
let cachedUser: Agent | null = null;

// Helper to get current user info
export const getCurrentUser = (): Agent | null => {
  return cachedUser;
};

// Helper to save current user info
export const setCurrentUser = (user: Agent | null): void => {
  cachedUser = user;
};

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: string;
  _retry?: boolean;
}

// Core fetch wrapper that automatically handles Bearer authorization & token refreshing
export const apiFetch = async <T = Record<string, unknown>>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  // Set default headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Add authorization header if we have an access token
  const { accessToken } = getTokens();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = (await response.json()) as ApiResponse<T>;

    // Check if unauthorized, indicating token might have expired
    if ((response.status === 401 || data.statusCode === 401) && !options._retry) {
      const { refreshToken } = getTokens();

      if (refreshToken) {
        // Attempt token refresh
        const refreshRes = await fetch(`${BASE_URL}/agent/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = (await refreshRes.json()) as ApiResponse<{ accessToken?: string }>;
          if (refreshData.status && refreshData.accessToken) {
            // Store the new access token
            setTokens(refreshData.accessToken);

            // Retry the original request with the new access token
            headers["Authorization"] = `Bearer ${refreshData.accessToken}`;
            return await apiFetch<T>(endpoint, {
              ...options,
              _retry: true, // Prevent infinite retry loops
              headers,
            });
          }
        }
      }

      // If refresh fails or there is no refresh token, log out
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?message=session_expired`;
      }
    }

    return data;
  } catch (error) {
    console.error("API Fetch Error:", error);
    const message = error instanceof Error ? error.message : "Network error. Please try again.";
    return { status: false, message } as ApiResponse<T>;
  }
};

// ─── Param object shapes ───────────────────────────────────────────────────
export interface Credentials {
  email: string;
  password: string;
}

export interface KycPayload {
  liveSelfie: string;
  selfDeclarationVideo: string;
  governmentIdFront: string;
  governmentIdBack: string;
}

export interface WithdrawalPayload {
  amount: number;
  currency: string;
  walletId: string;
  note?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface InvestmentPlanParams extends ListParams {
  category?: string;
  riskLevel?: string;
  featured?: string;
}

export interface ClientListParams extends ListParams {
  agent?: string;
}

export interface RegisterClientPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  referralCode?: string;
}

// Auth API Methods
export const api = {
  // Sign In / Login
  signIn: async ({ email, password }: Credentials) => {
    const res = await apiFetch<{ accessToken?: string; refreshToken?: string; user?: Agent }>(
      "/agent/sign-in",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    if (res.status && res.accessToken && res.refreshToken) {
      setTokens(res.accessToken, res.refreshToken);
      setCurrentUser(res.user ?? null);
    }
    return res;
  },

  // Verify OTP
  verifyOtp: async ({ email, otp }: { email: string; otp: string }) => {
    return await apiFetch("/agent/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  // Resend OTP
  resendOtp: async ({ email }: { email: string }) => {
    return await apiFetch("/agent/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Forgot Password / Reset Password
  forgotPassword: async ({ email, password }: Credentials) => {
    return await apiFetch("/agent/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // Logout
  logout: async (): Promise<void> => {
    const { refreshToken } = getTokens();
    if (refreshToken) {
      try {
        await apiFetch("/agent/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch (e) {
        console.error("Logout request error:", e);
      }
    }
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  // Submit KYC
  submitKyc: async ({
    liveSelfie,
    selfDeclarationVideo,
    governmentIdFront,
    governmentIdBack,
  }: KycPayload) => {
    const res = await apiFetch<{ user?: Agent }>("/agent/submit-kyc", {
      method: "POST",
      body: JSON.stringify({ liveSelfie, selfDeclarationVideo, governmentIdFront, governmentIdBack }),
    });
    if (res.status && res.user) {
      setCurrentUser(res.user);
    }
    return res;
  },

  // ─── Payout destinations (agent self-service) ───────────────────────────────
  getMyWallets: async () => {
    return await apiFetch<{ data?: Wallet[] }>("/agent/me/wallets");
  },

  addWallet: async (details: Partial<Wallet>) => {
    return await apiFetch<{ data?: Wallet }>("/agent/me/wallets", {
      method: "POST",
      body: JSON.stringify(details),
    });
  },

  // ─── Payouts (withdrawals) ──────────────────────────────────────────────────
  createWithdrawal: async ({ amount, currency, walletId, note }: WithdrawalPayload) => {
    return await apiFetch<{ data?: Withdrawal }>("/withdrawals", {
      method: "POST",
      body: JSON.stringify({ amount, currency, withdrawalMethod: "wallet", walletId, note }),
    });
  },

  myWithdrawals: async ({ page = 1, limit = 10, status }: ListParams = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status) params.set("status", status);
    return await apiFetch<{ data?: Paginated<Withdrawal> }>(`/withdrawals/my?${params.toString()}`);
  },

  // ─── Investment Plans ──────────────────────────────────────────────────────
  getInvestmentPlans: async (params: InvestmentPlanParams = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.category) q.set("category", params.category);
    if (params.status) q.set("status", params.status);
    if (params.riskLevel) q.set("riskLevel", params.riskLevel);
    if (params.featured) q.set("featured", params.featured);
    const qs = q.toString();
    return await apiFetch<{ plans?: Paginated<InvestmentPlan> }>(
      `/investment-plans${qs ? `?${qs}` : ""}`,
    );
  },

  // ─── Clients ───────────────────────────────────────────────────────────────
  getClients: async (params: ClientListParams = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.agent) q.set("agent", params.agent);
    const qs = q.toString();
    return await apiFetch<{ clients?: Paginated<Client>; data?: Paginated<Client> }>(
      `/clients${qs ? `?${qs}` : ""}`,
    );
  },

  registerClient: async ({
    firstName,
    lastName,
    email,
    password,
    referralCode,
  }: RegisterClientPayload) => {
    return await apiFetch("/clients", {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        referralCode,
        registeredByAgent: true,
      }),
    });
  },

  getClientDetails: async (clientId: string) => {
    return await apiFetch<{ data?: Client }>(`/clients/${clientId}`);
  },

  updateClient: async (payload: Record<string, unknown>) => {
    return await apiFetch<{ client?: Client; data?: Client }>("/clients/update", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getClientWallets: async (clientId: string) => {
    return await apiFetch<{ wallets?: LedgerWallet[] }>(
      `/transactions/admin/fund-balances?userId=${clientId}&userModel=Client`,
    );
  },

  getClientTransactions: async (clientId: string, params: ListParams = {}) => {
    const q = new URLSearchParams();
    q.set("clientId", clientId);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return await apiFetch<{
      transactions?: Paginated<ClientTransaction>;
      data?: Paginated<ClientTransaction>;
    }>(`/transactions/client?${q.toString()}`);
  },

  getClientPortfolios: async (clientId: string, params: ListParams = {}) => {
    const q = new URLSearchParams();
    q.set("clientId", clientId);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return await apiFetch<{ portfolios?: Portfolio[]; data?: Paginated<Portfolio> }>(
      `/portfolio/admin/list?${q.toString()}`,
    );
  },

  // Bank Details
  getClientBankDetails: async (clientId: string) => {
    return await apiFetch<{ data?: BankDetail[] }>(`/clients/${clientId}/bank-details`);
  },
  addClientBankDetail: async (payload: Record<string, unknown>) => {
    return await apiFetch("/clients/bank-details", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateClientBankDetail: async (payload: Record<string, unknown>) => {
    return await apiFetch("/clients/bank-details/update", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteClientBankDetail: async (id: string) => {
    return await apiFetch(`/clients/bank-details/${id}`, {
      method: "DELETE",
    });
  },

  // Wallets
  getClientWalletsList: async (clientId: string) => {
    return await apiFetch<{ data?: Wallet[] }>(`/clients/${clientId}/wallets`);
  },
  addClientWallet: async (payload: Record<string, unknown>) => {
    return await apiFetch("/clients/wallets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateClientWallet: async (payload: Record<string, unknown>) => {
    return await apiFetch("/clients/wallets/update", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteClientWallet: async (id: string) => {
    return await apiFetch(`/clients/wallets/${id}`, {
      method: "DELETE",
    });
  },

  // ─── Agent self profile update ─────────────────────────────────────────────
  updateProfile: async (payload: Record<string, unknown>) => {
    const res = await apiFetch<{ agent?: Agent }>("/agent/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (res?.status && res.agent) {
      setCurrentUser(res.agent);
    }
    return res;
  },
};
