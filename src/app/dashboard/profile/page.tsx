"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera, Check, Edit2, Loader2, Mail, X, AlertCircle,
  ShieldCheck, Award, MapPin, User, Phone, Calendar,
  Globe, Building2, Hash, Copy, CheckCheck, ChevronRight,
} from "lucide-react";
import { useAgent } from "../../../components/AgentContext";
import { api } from "../../../utils/api";
import { optimizeImage, uploadAsset } from "../../../utils/cloudinaryUpload";
import { toastSuccess, toastError } from "../../../utils/toast-message/taost-message";
import type { Agent } from "@/types";

// ─── constants ────────────────────────────────────────────────────────────────
const KYC_BADGE = {
  approved:     { bg: "bg-emerald-50",  ring: "ring-emerald-200",  text: "text-emerald-700", label: "Approved" },
  under_review: { bg: "bg-amber-50",    ring: "ring-amber-200",    text: "text-amber-700",   label: "Under Review" },
  pending:      { bg: "bg-slate-100",   ring: "ring-slate-200",    text: "text-slate-600",   label: "Pending" },
  rejected:     { bg: "bg-rose-50",     ring: "ring-rose-200",     text: "text-rose-700",    label: "Rejected" },
};

const TIER_COLORS: Record<string, string> = {
  diamond: "from-indigo-600 to-blue-700",
  gold:    "from-amber-500 to-amber-600",
  silver:  "from-slate-400 to-slate-500",
  basic:   "from-slate-600 to-slate-700",
};

const KYC_BADGE_MAP = KYC_BADGE as Record<string, (typeof KYC_BADGE)["approved"]>;

const GENDERS    = ["male", "female", "other"];
const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "INR", "AED", "AUD", "CAD"];

interface ProfileForm {
  firstName: string; lastName: string; phoneNumber: string; dateOfBirth: string;
  gender: string; country: string; countryCode: string; state: string; city: string;
  address: string; postalCode: string; preferredCurrency: string;
}

const EMPTY_FORM: ProfileForm = {
  firstName: "", lastName: "", phoneNumber: "", dateOfBirth: "",
  gender: "", country: "", countryCode: "", state: "", city: "",
  address: "", postalCode: "", preferredCurrency: "USD",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const initials = (u: Agent | null) =>
  ((u?.firstName?.[0] || "") + (u?.lastName?.[0] || "")).toUpperCase() || "A";

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const currency = (v?: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(v ?? 0);

// ─── Field components ─────────────────────────────────────────────────────────
interface DisplayRowProps {
  label: string;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}
function DisplayRow({ label, value, icon: Icon }: DisplayRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      {Icon && <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-navy break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

interface EditFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: string;
  options?: string[];
}
function EditField({ label, name, value, onChange, type = "text", options }: EditFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-navy focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/10 transition"
        >
          <option value="">— select —</option>
          {options.map((o: string) => (
            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-navy placeholder:text-slate-300 focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/10 transition"
        />
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser } = useAgent();

  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<ProfileForm>(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedId, setCopiedId]     = useState(false);
  const [copiedRef, setCopiedRef]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── populate form from context user ──
  const enterEdit = () => {
    if (!user) return;
    setForm({
      firstName:         user.firstName         ?? "",
      lastName:          user.lastName          ?? "",
      phoneNumber:       user.phoneNumber        ?? "",
      dateOfBirth:       user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0] ?? ""
        : "",
      gender:            user.gender             ?? "",
      country:           user.country            ?? "",
      countryCode:       user.countryCode        ?? "",
      state:             user.state              ?? "",
      city:              user.city               ?? "",
      address:           user.address            ?? "",
      postalCode:        user.postalCode         ?? "",
      preferredCurrency: user.preferredCurrency  ?? "USD",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setAvatarFile(null);
    setAvatarPreview("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toastError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { toastError("Image must be under 5 MB.");    return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── upload avatar via signed direct-to-Cloudinary flow (`POST /cloudionary`) ──
  const uploadAvatar = async (file: File): Promise<string> => {
    const { blob, filename } = await optimizeImage(file);
    return uploadAsset("profile_image", blob, filename);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let profileImage = user.profileImage ?? "";

      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          profileImage = await uploadAvatar(avatarFile);
        } finally {
          setUploadingAvatar(false);
        }
      }

      const payload = { ...form, profileImage };
      const res = await api.updateProfile(payload);

      if (!res?.status) {
        toastError(res?.message || "Failed to save profile.");
        return;
      }

      // Merge updated data into AgentContext
      const updated: Agent = res.agent ?? { ...user, ...payload };
      setUser(updated);
      toastSuccess("Profile saved successfully!");
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview("");
    } catch (err) {
      toastError("An error occurred while saving.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-7 w-7 text-rose-400" />
          <p className="text-sm font-medium text-slate-500">Could not load profile.</p>
        </div>
      </div>
    );
  }

  // ── derived display values ──
  const fullName   = user.fullName || `${user.firstName || "Agent"} ${user.lastName || ""}`.trim();
  const agentLevel = user.agentLevel
    ? user.agentLevel.charAt(0).toUpperCase() + user.agentLevel.slice(1) + " Partner"
    : "Basic Partner";
  const tierGradient = TIER_COLORS[user.agentLevel ?? ""] ?? TIER_COLORS.basic;
  const kyc = KYC_BADGE_MAP[user.kycStatus ?? ""] ?? KYC_BADGE.pending;
  const avatarSrc = avatarPreview || user.profileImage;
  const memberSince = user.joiningDate
    ? new Date(user.joiningDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-0">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* ══ HERO COVER ══ */}
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-navy sm:h-52">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 left-[10%] h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-[8%] h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pg" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M36 0H0V36" fill="none" stroke="#9ec5f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pg)" />
          </svg>
        </div>

        {/* Top action bar */}
        <div className="relative mx-auto flex h-full max-w-5xl items-start justify-between px-5 pt-6 sm:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Partner Portal</p>
            <h1 className="mt-1.5 text-[26px] font-bold leading-none text-white sm:text-[30px]">My Profile</h1>
          </div>

          {!editMode ? (
            <button
              onClick={enterEdit}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/15 focus:outline-none"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/15 disabled:opacity-50 focus:outline-none"
              >
                <X className="h-3.5 w-3.5" /> Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-navy shadow transition hover:bg-slate-100 disabled:opacity-60 focus:outline-none"
              >
                {saving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />}
                {uploadingAvatar ? "Uploading…" : saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="max-w-5xl space-y-8 pt-0">
        {/* ── Identity strip ── */}
        <div className="-mt-14 flex flex-col items-center gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="rounded-full bg-slate-50 p-1.5">
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-slate-200 sm:h-32 sm:w-32">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-tr ${tierGradient}`}>
                    <span className="text-4xl font-extrabold text-white">{initials(user)}</span>
                  </div>
                )}
                {editMode && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
                  >
                    <Camera className="h-5 w-5 text-white" />
                    <span className="mt-0.5 text-[10px] font-semibold text-white/90">Change</span>
                  </button>
                )}
              </div>
            </div>
            {/* Online dot */}
            <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-[3px] border-slate-50 bg-emerald-400" />
          </div>

          {/* Name + badges */}
          <div className="flex-1 pb-1 text-center sm:pb-2 sm:text-left">
            <h2 className="text-[24px] font-bold leading-tight text-navy sm:text-[27px]">{fullName}</h2>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${kyc.bg} ${kyc.ring} ${kyc.text}`}>
                <ShieldCheck className="h-3 w-3" /> KYC · {kyc.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white bg-gradient-to-r ${tierGradient}`}>
                <Award className="h-3 w-3" /> {agentLevel}
              </span>
            </div>
          </div>

          {/* Upload photo button when editing */}
          {editMode && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-50 focus:outline-none"
            >
              <Camera className="h-3.5 w-3.5" />
              {avatarFile ? `${avatarFile.name.slice(0, 14)}…` : "Upload Photo"}
            </button>
          )}
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 sm:grid-cols-4">
          {[
            { label: "Agent ID",     value: user.agentId  || "—" },
            { label: "Member Since", value: memberSince },
            { label: "Currency",     value: user.preferredCurrency || "USD" },
            { label: "Commission",   value: `${(user.commissionPercentage ?? 2).toFixed(1)}%` },
          ].map((s) => (
            <div key={s.label} className="bg-white px-5 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{s.label}</p>
              <p className="mt-1.5 text-[16px] font-bold text-navy">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Detail sections ── */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Personal Info */}
          <Section title="Personal Information">
            {editMode ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EditField label="First Name"   name="firstName"   value={form.firstName}   onChange={handleChange} />
                <EditField label="Last Name"    name="lastName"    value={form.lastName}    onChange={handleChange} />
                <EditField label="Phone Number" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} type="tel" />
                <EditField label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" />
                <div className="sm:col-span-2">
                  <EditField label="Gender" name="gender" value={form.gender} onChange={handleChange} options={GENDERS} />
                </div>
              </div>
            ) : (
              <div>
                <DisplayRow icon={User}     label="First Name"    value={user.firstName} />
                <DisplayRow icon={User}     label="Last Name"     value={user.lastName} />
                <DisplayRow icon={Phone}    label="Phone Number"  value={user.phoneNumber} />
                <DisplayRow icon={Calendar} label="Date of Birth" value={fmtDate(user.dateOfBirth)} />
                <DisplayRow icon={User}     label="Gender"        value={user.gender ? (user.gender.charAt(0).toUpperCase() + user.gender.slice(1)) : null} />
              </div>
            )}
          </Section>

          {/* Location */}
          <Section title="Location">
            {editMode ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EditField label="Country"      name="country"     value={form.country}     onChange={handleChange} />
                <EditField label="Country Code" name="countryCode" value={form.countryCode} onChange={handleChange} />
                <EditField label="State"        name="state"       value={form.state}       onChange={handleChange} />
                <EditField label="City"         name="city"        value={form.city}        onChange={handleChange} />
                <div className="sm:col-span-2">
                  <EditField label="Address"    name="address"     value={form.address}     onChange={handleChange} />
                </div>
                <EditField label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
                <EditField label="Preferred Currency" name="preferredCurrency" value={form.preferredCurrency} onChange={handleChange} options={CURRENCIES} />
              </div>
            ) : (
              <div>
                <DisplayRow icon={Globe}    label="Country"            value={user.country} />
                <DisplayRow icon={Globe}    label="Country Code"       value={user.countryCode} />
                <DisplayRow icon={MapPin}   label="State"              value={user.state} />
                <DisplayRow icon={Building2} label="City"             value={user.city} />
                <DisplayRow icon={MapPin}   label="Address"            value={user.address} />
                <DisplayRow icon={MapPin}   label="Postal Code"        value={user.postalCode} />
                <DisplayRow icon={Globe}    label="Preferred Currency" value={user.preferredCurrency} />
              </div>
            )}
          </Section>

          {/* Account Identity */}
          <Section title="Account Identity">
            {/* Agent ID with copy */}
            <div className="flex items-start gap-3 py-3 border-b border-slate-100">
              <Hash size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent ID</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-[13px] font-bold text-navy font-mono">{user.agentId || "—"}</p>
                  <button onClick={() => copyText(user.agentId ?? "", setCopiedId)} className="text-slate-400 hover:text-navy transition-colors">
                    {copiedId ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Referral Code */}
            <div className="flex items-start gap-3 py-3 border-b border-slate-100">
              <Hash size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Referral Code</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-[13px] font-bold text-navy font-mono tracking-wider">{user.referralCode || "—"}</p>
                  <button onClick={() => copyText(user.referralCode ?? "", setCopiedRef)} className="text-slate-400 hover:text-navy transition-colors">
                    {copiedRef ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            <DisplayRow icon={ShieldCheck} label="KYC Status"    value={kyc.label} />
            <DisplayRow icon={Award}       label="Agent Level"   value={agentLevel} />
            <DisplayRow icon={Calendar}    label="Joined"        value={memberSince} />
          </Section>

          {/* Commission Summary */}
          <Section title="Commission Summary">
            <DisplayRow label="Current Commission Tier"  value={`${(user.commissionPercentage ?? 2).toFixed(1)}%`} />
            <DisplayRow label="Total Earned (Lifetime)" value={currency(user.totalCommissionEarned, user.preferredCurrency)} />
            <DisplayRow label="Pending Approval"        value={currency(user.pendingCommission,       user.preferredCurrency)} />
            <DisplayRow label="Available Balance"       value={currency(user.availableCommissionBalance, user.preferredCurrency)} />
            <DisplayRow label="Total Paid Out"          value={currency(user.totalCommissionPaid,    user.preferredCurrency)} />
            <DisplayRow label="Salary Activation"       value={user.salaryActivated ? "Activated" : "Not Activated"} />
            <DisplayRow label="Monthly Salary Eligible" value={user.isSalaryEligibleThisMonth ? "Eligible" : "Ineligible"} />
          </Section>
        </div>
      </div>
    </div>
  );
}
