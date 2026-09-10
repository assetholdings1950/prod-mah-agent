"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User, Phone, Settings, ShieldCheck, Landmark, Wallet, BarChart3, FileText,
  Receipt, TrendingUp, ChevronLeft, ChevronDown, Loader2, ZoomIn, X, AlertCircle, Camera
} from "lucide-react";
import { api } from "../../../../utils/api";
import { useAgent } from "../../../../components/AgentContext";
import { toastError, toastSuccess } from "../../../../utils/toast-message/taost-message";
import type { BankDetail, Client, ClientTransaction, LedgerWallet, Portfolio, Wallet as WalletType } from "@/types";

const idOf = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id?: unknown })._id ?? "");
  return "";
};

// Tab configurations mirroring admin
const TABS = [
  { key: "personal", label: "Personal", icon: <User size={14} /> },
  { key: "contact", label: "Contact", icon: <Phone size={14} /> },
  { key: "account", label: "Account & Settings", icon: <Settings size={14} /> },
  { key: "kyc", label: "KYC Details", icon: <ShieldCheck size={14} /> },
  { key: "bank", label: "Bank Details", icon: <Landmark size={14} /> },
  { key: "wallets", label: "Withdrawal Wallets", icon: <Wallet size={14} /> },
  { key: "financial", label: "Financial Overview", icon: <BarChart3 size={14} /> },
  { key: "notes", label: "Notes", icon: <FileText size={14} /> },
  { key: "transactions", label: "Transaction History", icon: <Receipt size={14} /> },
  { key: "balance", label: "Fund Balance", icon: <Wallet size={14} /> },
  { key: "portfolio", label: "Portfolios", icon: <TrendingUp size={14} /> },
];

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAgent();
  const clientId = String(params.clientId ?? "");

  const rawTab = searchParams.get("tab");
  const activeTab = TABS.some(t => t.key === rawTab) ? (rawTab as string) : "personal";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formState, setFormState] = useState<Record<string, any>>({});

  const resolveImageUrl = (url?: string | null) => {
    if (!url || typeof url !== "string" || !url.trim()) return null;
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
      return trimmed;
    }
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
    return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  };

  // Bank & Wallet states
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    branchName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    swiftCode: "",
    isPrimary: false
  });

  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [savingWallet, setSavingWallet] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState({
    label: "",
    network: "",
    walletAddress: "",
    isPrimary: false
  });

  // Tab specific data states
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [ledgers, setLedgers] = useState<LedgerWallet[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);

  const fetchBanks = useCallback(async () => {
    if (!clientId) return;
    setLoadingBanks(true);
    try {
      const res = await api.getClientBankDetails(clientId);
      if (res && res.status) {
        setBanks(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load bank details:", err);
    } finally {
      setLoadingBanks(false);
    }
  }, [clientId]);

  const fetchWallets = useCallback(async () => {
    if (!clientId) return;
    setLoadingWallets(true);
    try {
      const res = await api.getClientWalletsList(clientId);
      if (res && res.status) {
        setWallets(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load wallets:", err);
    } finally {
      setLoadingWallets(false);
    }
  }, [clientId]);

  // Fetch Core Details
  const fetchClientDetails = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await api.getClientDetails(clientId);
      if (res && res.status && res.data) {
        setClient(res.data);
        const data = res.data;
        setFormState({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          profileImage: data.profileImage || "",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "",
          gender: data.gender || "male",
          phoneNumber: data.phoneNumber || "",
          countryCode: data.countryCode || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          postalCode: data.postalCode || "",
          address: data.address || "",
          preferredCurrency: data.preferredCurrency || "USD",
          riskProfile: data.riskProfile || "moderate",
          isKycRequired: data.isKycRequired || false,
          notes: data.notes || "",
          status: data.status || "pending",
          kycStatus: data.kycStatus || "pending",
          kycRemarks: data.kycVerification?.remarks || "",
          kycVerification: {
            governmentIdType: data.kycVerification?.governmentIdType || "",
            governmentIdNumber: data.kycVerification?.governmentIdNumber || "",
            governmentIdFront: data.kycVerification?.governmentIdFront || "",
            governmentIdBack: data.kycVerification?.governmentIdBack || "",
            liveSelfie: data.kycVerification?.liveSelfie || "",
            selfDeclarationVideo: data.kycVerification?.selfDeclarationVideo || ""
          }
        });
      } else {
        toastError(res?.message || "Failed to load client profile.");
      }
    } catch (err) {
      console.error(err);
      toastError("Failed to fetch client details.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientDetails();
  }, [fetchClientDetails]);

  // Sync active tab selection with URL search param
  const handleTabChange = (key: string) => {
    router.replace(`?tab=${key}`, { scroll: false });
  };

  // Fetch Tab Specific details dynamically on tab click
  useEffect(() => {
    if (!clientId) return;
    if (activeTab === "transactions") {
      setLoadingTransactions(true);
      api.getClientTransactions(clientId)
        .then(res => setTransactions(res.transactions?.docs || res.data?.docs || []))
        .catch(() => toastError("Failed to load transactions."))
        .finally(() => setLoadingTransactions(false));
    } else if (activeTab === "balance") {
      setLoadingLedgers(true);
      api.getClientWallets(clientId)
        .then(res => setLedgers(res.wallets || []))
        .catch(() => toastError("Failed to load active balances."))
        .finally(() => setLoadingLedgers(false));
    } else if (activeTab === "portfolio") {
      setLoadingPortfolios(true);
      api.getClientPortfolios(clientId)
        .then(res => setPortfolios(res.portfolios || res.data?.docs || []))
        .catch(() => toastError("Failed to load portfolios."))
        .finally(() => setLoadingPortfolios(false));
    } else if (activeTab === "bank") {
      fetchBanks();
    } else if (activeTab === "wallets") {
      fetchWallets();
    }
  }, [clientId, activeTab, fetchBanks, fetchWallets]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const { kycRemarks, kycVerification, status, kycStatus, isKycRequired, ...rest } = formState;
      const payload: Record<string, unknown> = { _id: client._id, ...rest };
      if (canEditCompliance) {
        payload.status = status;
        payload.kycStatus = kycStatus;
        payload.isKycRequired = isKycRequired;
        payload.kycVerification = {
          ...client.kycVerification,
          ...kycVerification,
          remarks: kycRemarks,
          verifiedAt: new Date().toISOString(),
        };
      }
      const res = await api.updateClient(payload);
      if (res && res.status) {
        setClient(res.client || res.data || client);
        setIsEditing(false);
        toastSuccess("Client updated successfully.");
        await fetchClientDetails();
      } else {
        toastError(res?.message || "Failed to save client details.");
      }
    } catch (err) {
      console.error(err);
      toastError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    if (!bankForm.bankName.trim()) { toastError("Bank name is required."); return; }
    if (!bankForm.accountNumber.trim()) { toastError("Account number is required."); return; }
    setSavingBank(true);
    try {
      if (editingBankId) {
        const res = await api.updateClientBankDetail({
          _id: editingBankId,
          ...bankForm,
          userId: clientId,
          userModel: "Client",
        });
        if (res && res.status) {
          toastSuccess("Bank detail updated.");
          setShowBankForm(false);
          setEditingBankId(null);
          fetchBanks();
        } else {
          toastError(res?.message || "Failed to update bank account.");
        }
      } else {
        const res = await api.addClientBankDetail({
          ...bankForm,
          userId: clientId,
          userModel: "Client",
        });
        if (res && res.status) {
          toastSuccess("Bank detail added.");
          setShowBankForm(false);
          fetchBanks();
        } else {
          toastError(res?.message || "Failed to add bank account.");
        }
      }
    } catch (err) {
      console.error(err);
      toastError("Something went wrong.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    setDeletingBankId(id);
    try {
      const res = await api.deleteClientBankDetail(id);
      if (res && res.status) {
        toastSuccess("Bank detail removed.");
        fetchBanks();
      } else {
        toastError(res?.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      toastError("Failed to delete.");
    } finally {
      setDeletingBankId(null);
    }
  };

  const handleSaveWallet = async () => {
    if (!walletForm.walletAddress.trim()) { toastError("Wallet address is required."); return; }
    if (!walletForm.network.trim()) { toastError("Network is required."); return; }
    setSavingWallet(true);
    try {
      if (editingWalletId) {
        const res = await api.updateClientWallet({
          _id: editingWalletId,
          ...walletForm,
          userId: clientId,
          userModel: "Client",
        });
        if (res && res.status) {
          toastSuccess("Wallet updated.");
          setShowWalletForm(false);
          setEditingWalletId(null);
          fetchWallets();
        } else {
          toastError(res?.message || "Failed to update wallet.");
        }
      } else {
        const res = await api.addClientWallet({
          ...walletForm,
          userId: clientId,
          userModel: "Client",
        });
        if (res && res.status) {
          toastSuccess("Wallet added.");
          setShowWalletForm(false);
          fetchWallets();
        } else {
          toastError(res?.message || "Failed to add wallet.");
        }
      }
    } catch (err) {
      console.error(err);
      toastError("Something went wrong.");
    } finally {
      setSavingWallet(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    setDeletingWalletId(id);
    try {
      const res = await api.deleteClientWallet(id);
      if (res && res.status) {
        toastSuccess("Wallet removed.");
        fetchWallets();
      } else {
        toastError(res?.message || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      toastError("Failed to delete.");
    } finally {
      setDeletingWalletId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center py-20 font-sans">
        <Loader2 className="animate-spin text-navy/40 mb-3" size={32} />
        <span className="text-sm font-semibold text-slate-400">Loading Profile Console...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-400 font-light font-sans">
        <AlertCircle className="mx-auto text-rose-500 mb-2" size={36} />
        <p className="text-sm font-bold text-navy">Investor Profile Not Found</p>
        <p className="text-xs mt-1">This record does not exist or you do not have permission to view it.</p>
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-navy hover:underline">
          <ChevronLeft size={14} /> Back to Directory
        </Link>
      </div>
    );
  }

  const initials = `${client.firstName?.charAt(0) || ""}${client.lastName?.charAt(0) || ""}`.toUpperCase();
  const rawPhoto = (isEditing ? formState.profileImage : null) || client.profileImage || client.kycVerification?.liveSelfie || null;
  const displayPhotoUrl = resolveImageUrl(rawPhoto);

  // An agent assigned only as Account Manager (not the referring agent) can
  // maintain the profile but not the client's compliance state. The backend
  // enforces this too; here we just hide the controls.
  const myId = idOf(user?._id);
  const isReferrer = !!myId && idOf(client.agent) === myId;
  const isManagerOnly = !!myId && !isReferrer && idOf(client.accountManager) === myId;
  const canEditCompliance = !isManagerOnly;

  return (
    <div className="space-y-6 font-sans animate-fade-in text-navy">
      {/* Back button & strip */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-navy-light transition duration-150"
        >
          <ChevronLeft size={16} />
          <span>Back to Referred Directory</span>
        </Link>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Save Changes"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold bg-navy text-white hover:bg-navy-light px-3.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Identity Profile Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
        <div className="relative group shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-navy/10 border border-slate-200 flex items-center justify-center text-lg font-extrabold text-navy overflow-hidden shadow-sm">
            {displayPhotoUrl && !imageError ? (
              <img
                src={displayPhotoUrl}
                alt={`${client.firstName} ${client.lastName}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-navy to-navy-light text-white flex items-center justify-center font-extrabold text-base tracking-wider">
                {initials || "CL"}
              </div>
            )}
          </div>

          {isEditing && (
            <label
              className="absolute -bottom-1 -right-1 p-1.5 bg-navy hover:bg-navy-light text-white rounded-lg shadow-md cursor-pointer border-2 border-white transition transform hover:scale-105"
              title="Upload Client Photo"
            >
              <Camera size={13} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setFormState(prev => ({ ...prev, profileImage: reader.result as string }));
                      setImageError(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-navy leading-tight">{client.firstName} {client.lastName}</h2>
          <p className="text-xs text-navy-light/60 font-semibold mt-0.5">{client.email}</p>
        </div>
        <div className="sm:ml-auto flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1 select-all border border-slate-200/50 shadow-sm">
            {client.clientId}
          </span>
        </div>
      </div>

      {/* Tabbed Interface Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Tab Selection Bar */}
        {/* Desktop view */}
        <div className="hidden md:flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition border-b-2 -mb-px cursor-pointer ${
                  active ? "border-navy text-navy bg-white shadow-sm" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile view */}
        <div className="md:hidden p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">View Category Details</label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-navy focus:outline-none focus:ring-4 focus:ring-navy/5 appearance-none cursor-pointer"
            >
              {TABS.map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tab Detail Pane */}
        <div className="p-6 min-h-[300px]">
          
          {/* TAB 1: PERSONAL */}
          {activeTab === "personal" && (
            isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <EditField label="First Name" value={formState.firstName} onChange={(val) => setFormState(prev => ({ ...prev, firstName: val }))} />
                <EditField label="Last Name" value={formState.lastName} onChange={(val) => setFormState(prev => ({ ...prev, lastName: val }))} />
                <EditField label="Date of Birth" type="date" value={formState.dateOfBirth} onChange={(val) => setFormState(prev => ({ ...prev, dateOfBirth: val }))} />
                <EditField
                  label="Gender"
                  value={formState.gender}
                  onChange={(val) => setFormState(prev => ({ ...prev, gender: val }))}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" }
                  ]}
                />
                <EditField label="Email Address" value={client.email} disabled onChange={() => {}} />
                <EditField label="Client ID" value={client.clientId} disabled onChange={() => {}} />

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <FileUploadField
                    label="Client Profile Picture"
                    value={formState.profileImage}
                    onChange={(val) => {
                      setFormState(prev => ({ ...prev, profileImage: val }));
                      setImageError(false);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ProfileField label="First Name" value={client.firstName} />
                <ProfileField label="Last Name" value={client.lastName} />
                <ProfileField label="Date of Birth" value={client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "—"} />
                <ProfileField label="Gender" value={client.gender} className="capitalize" />
                <ProfileField label="Email Address" value={client.email} />
                <ProfileField label="Client ID" value={client.clientId} />

                {displayPhotoUrl && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <ImageThumbnail label="Profile Photo" url={displayPhotoUrl} onPreview={setPreviewUrl} />
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB 2: CONTACT */}
          {activeTab === "contact" && (
            isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <EditField label="Country Code" value={formState.countryCode} onChange={(val) => setFormState(prev => ({ ...prev, countryCode: val }))} />
                <EditField label="Phone Number" value={formState.phoneNumber} onChange={(val) => setFormState(prev => ({ ...prev, phoneNumber: val }))} />
                <EditField label="Country" value={formState.country} onChange={(val) => setFormState(prev => ({ ...prev, country: val }))} />
                <EditField label="State / Province" value={formState.state} onChange={(val) => setFormState(prev => ({ ...prev, state: val }))} />
                <EditField label="City" value={formState.city} onChange={(val) => setFormState(prev => ({ ...prev, city: val }))} />
                <EditField label="Postal Code" value={formState.postalCode} onChange={(val) => setFormState(prev => ({ ...prev, postalCode: val }))} />
                <EditField label="Street Address" value={formState.address} onChange={(val) => setFormState(prev => ({ ...prev, address: val }))} className="sm:col-span-2" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ProfileField label="Country Code" value={client.countryCode} />
                <ProfileField label="Phone Number" value={client.phoneNumber} />
                <ProfileField label="Country" value={client.country} />
                <ProfileField label="State / Province" value={client.state} />
                <ProfileField label="City" value={client.city} />
                <ProfileField label="Postal Code" value={client.postalCode} />
                <ProfileField label="Street Address" value={client.address} className="sm:col-span-2" />
              </div>
            )
          )}

          {/* TAB 3: ACCOUNT & SETTINGS */}
          {activeTab === "account" && (
            isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {canEditCompliance ? (
                  <EditField
                    label="Account Lifecycle Status"
                    value={formState.status}
                    onChange={(val) => setFormState(prev => ({ ...prev, status: val }))}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "active", label: "Active" },
                      { value: "suspended", label: "Suspended" },
                      { value: "closed", label: "Closed" }
                    ]}
                  />
                ) : (
                  <ProfileField label="Account Lifecycle Status" value={client.status} className="capitalize" />
                )}
                <EditField
                  label="Risk Profile Setting"
                  value={formState.riskProfile}
                  onChange={(val) => setFormState(prev => ({ ...prev, riskProfile: val }))}
                  options={[
                    { value: "conservative", label: "Conservative" },
                    { value: "moderate", label: "Moderate" },
                    { value: "aggressive", label: "Aggressive" }
                  ]}
                />
                <EditField
                  label="Preferred Ledger Currency"
                  value={formState.preferredCurrency}
                  onChange={(val) => setFormState(prev => ({ ...prev, preferredCurrency: val }))}
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "EUR", label: "EUR" },
                    { value: "GBP", label: "GBP" }
                  ]}
                />
                {canEditCompliance ? (
                  <EditField
                    label="KYC Enforced Status"
                    value={formState.isKycRequired ? "true" : "false"}
                    onChange={(val) => setFormState(prev => ({ ...prev, isKycRequired: val === "true" }))}
                    options={[
                      { value: "true", label: "Enforced & Mandated" },
                      { value: "false", label: "Bypassed / Optional" }
                    ]}
                  />
                ) : (
                  <ProfileField label="KYC Enforced Status" value={client.isKycRequired ? "Enforced & Mandated" : "Bypassed / Optional"} />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ProfileField label="Account Lifecycle Status" value={client.status} className="capitalize font-bold text-emerald-600" />
                <ProfileField label="Risk profile setting" value={client.riskProfile} className="capitalize" />
                <ProfileField label="Preferred Ledger Currency" value={client.preferredCurrency || "USD"} />
                <ProfileField label="KYC Enforced Status" value={client.isKycRequired ? "Enforced & Mandated" : "Bypassed / Optional"} />
              </div>
            )
          )}

          {/* TAB 4: KYC DETAILS */}
          {activeTab === "kyc" && (
            isEditing && canEditCompliance ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Document Proof</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <EditField
                      label="Document ID Type"
                      value={formState.kycVerification?.governmentIdType}
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), governmentIdType: val }
                      }))}
                      options={[
                        { value: "passport", label: "Passport" },
                        { value: "driving_license", label: "Driving License" },
                        { value: "national_id", label: "National ID Card" }
                      ]}
                    />
                    <EditField
                      label="Document ID Number"
                      value={formState.kycVerification?.governmentIdNumber}
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), governmentIdNumber: val }
                      }))}
                    />
                    <FileUploadField
                      label="Document ID Front"
                      value={formState.kycVerification?.governmentIdFront}
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), governmentIdFront: val }
                      }))}
                    />
                    <FileUploadField
                      label="Document ID Back"
                      value={formState.kycVerification?.governmentIdBack}
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), governmentIdBack: val }
                      }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Verification Media</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FileUploadField
                      label="Live Bio Selfie"
                      value={formState.kycVerification?.liveSelfie}
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), liveSelfie: val }
                      }))}
                    />
                    <FileUploadField
                      label="Self-Declaration Video Record"
                      value={formState.kycVerification?.selfDeclarationVideo}
                      accept="video/*"
                      onChange={(val) => setFormState(prev => ({
                        ...prev,
                        kycVerification: { ...(prev.kycVerification || {}), selfDeclarationVideo: val }
                      }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">KYC Audit Trail</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {canEditCompliance ? (
                      <EditField
                        label="Current KYC Status"
                        value={formState.kycStatus}
                        onChange={(val) => setFormState(prev => ({ ...prev, kycStatus: val }))}
                        options={[
                          { value: "pending", label: "Pending" },
                          { value: "under_review", label: "Under Review" },
                          { value: "approved", label: "Approved" },
                          { value: "rejected", label: "Rejected" }
                        ]}
                      />
                    ) : (
                      <ProfileField label="Current KYC Status" value={client.kycStatus} className="capitalize" />
                    )}
                    <EditField
                      label="Audit Remarks / Review Notes"
                      value={formState.kycRemarks}
                      className="sm:col-span-2"
                      onChange={(val) => setFormState(prev => ({ ...prev, kycRemarks: val }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {isEditing && isManagerOnly && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] font-semibold text-amber-800">
                    KYC verification is handled by the referring agent and administrators. You have read-only access to this section.
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Document Proof</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ProfileField label="Document ID Type" value={client.kycVerification?.governmentIdType || "—"} className="uppercase" />
                    <ProfileField label="Document ID Number" value={client.kycVerification?.governmentIdNumber || "—"} />
                    
                    {/* Images Thumbnails */}
                    <ImageThumbnail label="Document ID Front" url={client.kycVerification?.governmentIdFront} onPreview={setPreviewUrl} />
                    <ImageThumbnail label="Document ID Back" url={client.kycVerification?.governmentIdBack} onPreview={setPreviewUrl} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Verification Media</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ImageThumbnail label="Live Bio Selfie" url={client.kycVerification?.liveSelfie} onPreview={setPreviewUrl} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Self-Declaration Video Record</span>
                      {client.kycVerification?.selfDeclarationVideo ? (
                        <video
                          src={client.kycVerification.selfDeclarationVideo}
                          controls
                          className="w-full h-40 rounded-xl border border-slate-200 bg-black object-contain"
                        />
                      ) : (
                        <div className="h-40 rounded-xl border border-dashed border-slate-200/85 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-semibold italic shadow-inner">
                          No video declaration uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">KYC Audit Trail</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ProfileField label="Current KYC Status" value={client.kycStatus} className="capitalize font-bold text-sky-600" />
                    <ProfileField label="Submitted Timestamp" value={client.kycVerification?.submittedAt ? new Date(client.kycVerification.submittedAt).toLocaleString() : "—"} />
                    <ProfileField label="Verified Timestamp" value={client.kycVerification?.verifiedAt ? new Date(client.kycVerification.verifiedAt).toLocaleString() : "—"} />
                    <ProfileField label="Verified Auditor Profile" value={client.kycVerification?.verifiedBy ? (client.kycVerification.verifiedBy.fullName || client.kycVerification.verifiedBy.email) : "—"} />
                    <ProfileField label="Audit Remarks / Review Notes" value={client.kycVerification?.remarks || "No verification remarks."} className="sm:col-span-2 text-slate-500 italic" />
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 5: BANK DETAILS */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              {showBankForm ? (
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 flex flex-col gap-4">
                  <p className="text-[10px] font-bold text-navy uppercase tracking-wider">
                    {editingBankId ? "Edit Bank Account" : "Add Bank Account"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditField
                      label="Bank Name"
                      value={bankForm.bankName}
                      onChange={(v) => setBankForm(p => ({ ...p, bankName: v }))}
                      placeholder="e.g. DBS Bank Singapore"
                    />
                    <EditField
                      label="Branch Name"
                      value={bankForm.branchName}
                      onChange={(v) => setBankForm(p => ({ ...p, branchName: v }))}
                      placeholder="Branch name"
                    />
                    <EditField
                      label="Account Holder Name"
                      value={bankForm.accountName}
                      onChange={(v) => setBankForm(p => ({ ...p, accountName: v }))}
                      placeholder="Name as on account"
                    />
                    <EditField
                      label="Account Number"
                      value={bankForm.accountNumber}
                      onChange={(v) => setBankForm(p => ({ ...p, accountNumber: v }))}
                      placeholder="Account number"
                    />
                    <EditField
                      label="IFSC Code"
                      value={bankForm.ifscCode}
                      onChange={(v) => setBankForm(p => ({ ...p, ifscCode: v.toUpperCase() }))}
                      placeholder="IFSC code"
                    />
                    <EditField
                      label="SWIFT / BIC Code"
                      value={bankForm.swiftCode}
                      onChange={(v) => setBankForm(p => ({ ...p, swiftCode: v.toUpperCase() }))}
                      placeholder="SWIFT code"
                    />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit mt-2">
                    <input
                      type="checkbox"
                      checked={bankForm.isPrimary}
                      onChange={(e) => setBankForm(p => ({ ...p, isPrimary: e.target.checked }))}
                      className="w-4 h-4 rounded accent-navy"
                    />
                    <span className="text-xs text-navy font-bold">Set as primary bank account</span>
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleSaveBank}
                      disabled={savingBank}
                      className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      {savingBank ? <Loader2 size={12} className="animate-spin" /> : null}
                      {editingBankId ? "Update" : "Add Bank"}
                    </button>
                    <button
                      onClick={() => { setShowBankForm(false); setEditingBankId(null); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {loadingBanks ? (
                    <div className="flex justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-navy/40" />
                    </div>
                  ) : banks.length === 0 ? (
                    <div className="text-center py-12">
                      <Landmark className="mx-auto text-slate-300 mb-3 opacity-30" size={32} />
                      <p className="text-xs text-slate-400 italic font-semibold">No bank account details saved by this investor.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {banks.map((b) => (
                        <div key={b._id} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-2.5 relative group">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-navy">{b.bankName}</span>
                            <div className="flex items-center gap-1.5">
                              {b.isPrimary && (
                                <span className="text-[9px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100 uppercase">Primary</span>
                              )}
                              <button
                                onClick={() => {
                                  setBankForm({
                                    bankName: b.bankName || "",
                                    branchName: b.branchName || "",
                                    accountName: b.accountName || "",
                                    accountNumber: b.accountNumber || "",
                                    ifscCode: b.ifscCode || "",
                                    swiftCode: b.swiftCode || "",
                                    isPrimary: b.isPrimary || false
                                  });
                                  setEditingBankId(b._id);
                                  setShowBankForm(true);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-navy hover:bg-navy/5 border border-transparent hover:border-navy/10 cursor-pointer"
                                title="Edit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteBank(b._id)}
                                disabled={deletingBankId === b._id}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 cursor-pointer disabled:opacity-40"
                                title="Delete"
                              >
                                {deletingBankId === b._id ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-navy">
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">Account Name</span>
                              <span>{b.accountName || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">Account Number</span>
                              <span className="font-mono select-all">{b.accountNumber}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">IFSC / Routing Code</span>
                              <span className="font-mono">{b.ifscCode || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">SWIFT Code</span>
                              <span className="font-mono">{b.swiftCode || "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setBankForm({
                        bankName: "",
                        branchName: "",
                        accountName: "",
                        accountNumber: "",
                        ifscCode: "",
                        swiftCode: "",
                        isPrimary: false
                      });
                      setEditingBankId(null);
                      setShowBankForm(true);
                    }}
                    className="self-start flex items-center gap-1.5 text-xs font-bold text-navy border border-navy/30 bg-navy/5 hover:bg-navy/10 px-4 py-2 rounded-xl transition cursor-pointer mt-2"
                  >
                    Add Bank Account
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 6: WITHDRAWAL WALLETS */}
          {activeTab === "wallets" && (
            <div className="space-y-4">
              {showWalletForm ? (
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 flex flex-col gap-4">
                  <p className="text-[10px] font-bold text-navy uppercase tracking-wider">
                    {editingWalletId ? "Edit Wallet" : "Add Wallet"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <EditField
                      label="Label"
                      value={walletForm.label}
                      onChange={(v) => setWalletForm(p => ({ ...p, label: v }))}
                      placeholder="e.g. My BTC Wallet"
                    />
                    <EditField
                      label="Network"
                      value={walletForm.network}
                      onChange={(v) => setWalletForm(p => ({ ...p, network: v }))}
                      placeholder="e.g. Bitcoin, Ethereum"
                    />
                    <EditField
                      label="Wallet Address"
                      value={walletForm.walletAddress}
                      onChange={(v) => setWalletForm(p => ({ ...p, walletAddress: v }))}
                      placeholder="0x... or bc1..."
                    />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit mt-2">
                    <input
                      type="checkbox"
                      checked={walletForm.isPrimary}
                      onChange={(e) => setWalletForm(p => ({ ...p, isPrimary: e.target.checked }))}
                      className="w-4 h-4 rounded accent-navy"
                    />
                    <span className="text-xs text-navy font-bold">Set as primary wallet</span>
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleSaveWallet}
                      disabled={savingWallet}
                      className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      {savingWallet ? <Loader2 size={12} className="animate-spin" /> : null}
                      {editingWalletId ? "Update" : "Add Wallet"}
                    </button>
                    <button
                      onClick={() => { setShowWalletForm(false); setEditingWalletId(null); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {loadingWallets ? (
                    <div className="flex justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-navy/40" />
                    </div>
                  ) : wallets.length === 0 ? (
                    <div className="text-center py-12">
                      <Wallet className="mx-auto text-slate-300 mb-3 opacity-30" size={32} />
                      <p className="text-xs text-slate-400 italic font-semibold">No saved crypto payout addresses found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wallets.map((w) => (
                        <div key={w._id} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative group">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-navy uppercase tracking-wider">{w.network}</span>
                              {w.label && <span className="text-[9px] font-bold bg-navy/5 text-navy border border-navy/10 px-1.5 py-0.5 rounded">{w.label}</span>}
                            </div>
                            <span className="block text-[11px] text-slate-500 font-mono mt-1 break-all select-all">{w.walletAddress}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {w.isPrimary && (
                              <span className="text-[9px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100 uppercase">Primary</span>
                            )}
                            <button
                              onClick={() => {
                                setWalletForm({
                                  label: w.label || "",
                                  network: w.network || "",
                                  walletAddress: w.walletAddress || "",
                                  isPrimary: w.isPrimary || false
                                });
                                setEditingWalletId(w._id);
                                setShowWalletForm(true);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-navy hover:bg-navy/5 border border-transparent hover:border-navy/10 cursor-pointer"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteWallet(w._id)}
                              disabled={deletingWalletId === w._id}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 cursor-pointer disabled:opacity-40"
                              title="Delete"
                            >
                              {deletingWalletId === w._id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setWalletForm({
                        label: "",
                        network: "",
                        walletAddress: "",
                        isPrimary: false
                      });
                      setEditingWalletId(null);
                      setShowWalletForm(true);
                    }}
                    className="self-start flex items-center gap-1.5 text-xs font-bold text-navy border border-navy/30 bg-navy/5 hover:bg-navy/10 px-4 py-2 rounded-xl transition cursor-pointer mt-2"
                  >
                    Add Wallet
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 7: FINANCIAL OVERVIEW */}
          {activeTab === "financial" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <ProfileField label="Total Capital Portfolio Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: client.preferredCurrency || "USD" }).format(client.portfolioValue || 0)} className="font-bold text-navy" />
              <ProfileField label="Total Net Profits Earned" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: client.preferredCurrency || "USD" }).format(client.totalProfitEarned || 0)} className="font-bold text-emerald-600" />
              <ProfileField label="Current Uninvested Wallet Balance" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: client.preferredCurrency || "USD" }).format(client.availableBalance || 0)} />
              <ProfileField label="Total Lifetime Deposit Capital" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: client.preferredCurrency || "USD" }).format(client.totalDeposits || 0)} />
              <ProfileField label="Total Lifetime Withdrawal Capital" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: client.preferredCurrency || "USD" }).format(client.totalWithdrawals || 0)} />
            </div>
          )}

          {/* TAB 8: NOTES */}
          {activeTab === "notes" && (
            isEditing ? (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Investor Internal Profile Notes</span>
                <textarea
                  value={formState.notes}
                  onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                  rows={6}
                  className="w-full text-xs text-navy bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/50 transition shadow-sm placeholder:text-slate-300"
                  placeholder="Enter remarks or notes about this client..."
                />
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Investor Internal Profile Notes</span>
                <div className="w-full text-xs text-navy bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[120px] whitespace-pre-wrap leading-relaxed shadow-inner font-light">
                  {client.notes || "No profile remarks/notes have been recorded for this client."}
                </div>
              </div>
            )
          )}

          {/* TAB 9: TRANSACTION HISTORY */}
          {activeTab === "transactions" && (
            <div className="overflow-x-auto">
              {loadingTransactions ? (
                <div className="py-12 text-center">
                  <Loader2 className="animate-spin text-navy/40 mx-auto mb-2" size={24} />
                  <span className="text-xs text-slate-400 font-semibold">Loading transaction history...</span>
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs italic font-semibold">No recorded transactions found for this investor.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-4">Transaction Date</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Reference Reference ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {transactions.map((tx) => {
                      const tone = 
                        tx.status === "approved" || tx.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        tx.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100";
                      
                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 text-slate-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}</td>
                          <td className="py-3 px-4 font-bold capitalize text-navy">{tx.type}</td>
                          <td className="py-3 px-4 font-bold text-navy">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency || "USD" }).format(tx.amount || 0)}
                          </td>
                          <td className="py-3 px-4 capitalize">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${tone}`}>{tx.status}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[10px] select-all">{tx.transactionId || tx.referenceId || tx._id}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 10: LEDGERS / BALANCES */}
          {activeTab === "balance" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {loadingLedgers ? (
                <div className="py-12 text-center col-span-full">
                  <Loader2 className="animate-spin text-navy/40 mx-auto mb-2" size={24} />
                  <span className="text-xs text-slate-400 font-semibold">Loading ledger balances...</span>
                </div>
              ) : ledgers.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs italic font-semibold col-span-full">No active currency wallets found.</p>
              ) : (
                ledgers.map((w) => (
                  <div key={w._id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-navy uppercase tracking-wider">{w.currency} Ledger Wallet</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div>
                      <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">Available Balance</span>
                      <span className="text-xl font-extrabold text-navy leading-none mt-1 block">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD" }).format(w.balance || 0)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/50 text-[10px] font-semibold text-navy">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Deposits</span>
                        <span className="font-extrabold text-emerald-600">+{new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD", maximumFractionDigits: 0 }).format(w.totalDeposited || 0)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Withdrawn</span>
                        <span className="font-extrabold text-slate-500">-{new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD", maximumFractionDigits: 0 }).format(w.totalWithdrawn || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 11: PORTFOLIOS */}
          {activeTab === "portfolio" && (
            <div className="overflow-x-auto">
              {loadingPortfolios ? (
                <div className="py-12 text-center">
                  <Loader2 className="animate-spin text-navy/40 mx-auto mb-2" size={24} />
                  <span className="text-xs text-slate-400 font-semibold">Loading portfolios...</span>
                </div>
              ) : portfolios.length === 0 ? (
                <p className="text-center text-slate-400 py-12 text-xs italic font-semibold">No active investment portfolios found.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-4">Portfolio ID</th>
                      <th className="py-2.5 px-4">Plan Name</th>
                      <th className="py-2.5 px-4">Initial Investment</th>
                      <th className="py-2.5 px-4">Expected Maturity</th>
                      <th className="py-2.5 px-4">ROI Rate</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {portfolios.map((p) => {
                      const tone = 
                        p.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        p.status === "pending" || p.status === "claimed" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-500 border-slate-200";
                      
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-mono font-bold text-navy tracking-tight">{p.portfolioId}</td>
                          <td className="py-3 px-4 font-bold text-navy capitalize">{p.planSnapshot?.name || p.planName || p.planId?.name || "Active Plan"}</td>
                          <td className="py-3 px-4 font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || "USD" }).format(p.initialAmount || p.amountUsd || 0)}
                          </td>
                          <td className="py-3 px-4">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || "USD" }).format(p.maturityPayout || 0)}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 font-bold">{p.roiPercentage || p.roiMin || 0}% p.a.</td>
                          <td className="py-3 px-4 capitalize">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${tone}`}>{p.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 backdrop-blur-sm p-4 font-sans animate-fade-in"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
          <img
            src={previewUrl}
            alt="Auditing proof view"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-slate-200/20 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// Sub-Component: Key-Value Field Box
function ProfileField({ label, value, className = "" }: { label: string; value?: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`w-full text-xs text-navy-light bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono select-all shadow-sm truncate ${className}`}>
        {value !== null && value !== undefined && value !== "" ? value : <span className="text-slate-300 italic">Unspecified</span>}
      </div>
    </div>
  );
}

// Sub-Component: Document Image Thumbnail
function ImageThumbnail({ label, url, onPreview }: { label: string; url?: string; onPreview: (url: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {url ? (
        <button
          type="button"
          onClick={() => onPreview(url)}
          className="group relative block w-full rounded-xl overflow-hidden border border-slate-200 focus:outline-none focus:ring-4 focus:ring-navy/5 cursor-pointer bg-slate-50 shadow-sm"
        >
          <img src={url} alt={label} className="w-full h-40 object-cover" />
          <span className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-1.5 text-white text-xs font-bold">
            <ZoomIn size={14} /> Preview Doc
          </span>
        </button>
      ) : (
        <div className="h-40 rounded-xl border border-dashed border-slate-200/85 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-semibold italic shadow-inner">
          Not uploaded
        </div>
      )}
    </div>
  );
}

// Sub-Component: Key-Value Input/Select Edit Box
interface EditFieldProps {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  type?: string;
  options?: { value: string; label: string }[] | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}
function EditField({ label, value, onChange, type = "text", options = null, disabled = false, placeholder = "", className = "" }: EditFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full text-xs text-navy bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/50 transition disabled:opacity-60 shadow-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full text-xs text-navy bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/50 transition disabled:opacity-60 shadow-sm placeholder:text-slate-300 font-mono"
        />
      )}
    </div>
  );
}

// Sub-Component: base64 File Upload Box
function FileUploadField({ label, value, onChange, accept = "image/*" }: { label: string; value?: string; onChange: (val: string) => void; accept?: string }) {
  const [localUploading, setLocalUploading] = useState(false);

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
      setLocalUploading(false);
    };
    reader.onerror = () => {
      setLocalUploading(false);
      toastError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="relative group rounded-xl border border-dashed border-slate-200 bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-4 min-h-[140px] shadow-sm">
        {value ? (
          <div className="relative w-full h-28 rounded-lg overflow-hidden group">
            {accept.includes("video") ? (
              <video src={value} className="w-full h-full object-cover bg-black" controls />
            ) : (
              <img src={value} alt={label} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
              <label className="text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-navy hover:bg-navy-light cursor-pointer shadow">
                Replace File
                <input type="file" accept={accept} className="hidden" onChange={handleUploadFile} />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            {localUploading ? (
              <Loader2 size={24} className="animate-spin text-navy/40" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            )}
            <label className="text-xs text-navy font-bold hover:underline cursor-pointer">
              Click to upload
              <input type="file" accept={accept} className="hidden" onChange={handleUploadFile} />
            </label>
            <span className="text-[9px] text-slate-400">Supported formats: {accept.includes("video") ? "MP4/WebM" : "JPG/PNG"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
