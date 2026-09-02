"use client";

import { toast } from "sonner";
import {
    CircleX,
    Loader,
    BadgeCheck,
    BadgeX,
    BadgeAlert,
    BadgeInfo,
    BadgeQuestionMark,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
    description?: string;
    duration?: number;
    position?:
        | "top-left"
        | "top-center"
        | "top-right"
        | "bottom-left"
        | "bottom-center"
        | "bottom-right";
}

const ToastIcon = ({ type }: { type: ToastType }) => {
    const iconProps = { className: "w-[18px] h-[18px]" };

    switch (type) {
        case "success":
            return <BadgeCheck {...iconProps} />;
        case "error":
            return <BadgeX {...iconProps} />;
        case "warning":
            return <BadgeAlert {...iconProps} />;
        case "info":
            return <BadgeInfo {...iconProps} />;
        case "loading":
            return (
                <Loader
                    {...iconProps}
                    className={`${iconProps.className} animate-spin`}
                />
            );
        default:
            return <BadgeQuestionMark {...iconProps} />;
    }
};

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION = "top-center";

const toastColors: Record<ToastType, { bar: string; icon: string; dot: string }> = {
    success: {
        bar: "bg-emerald-500",
        icon: "text-emerald-500",
        dot: "bg-emerald-400",
    },
    error: {
        bar: "bg-red-500",
        icon: "text-red-500",
        dot: "bg-red-400",
    },
    warning: {
        bar: "bg-amber-400",
        icon: "text-amber-500",
        dot: "bg-amber-400",
    },
    info: {
        bar: "bg-blue-500",
        icon: "text-blue-500",
        dot: "bg-blue-400",
    },
    loading: {
        bar: "bg-slate-400",
        icon: "text-slate-400",
        dot: "bg-slate-400",
    },
};

export const showToast = (
    type: ToastType,
    message: string,
    options?: ToastOptions
) => {
    const { bar, icon, dot } = toastColors[type] || toastColors.info;

    return toast.custom(
        (t: string | number) => (
            <div className="w-full max-w-[340px] mx-auto">
                {/* Outer shell */}
                <div className="relative bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden font-sans">

                    {/* Top accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />

                    {/* Content */}
                    <div className="flex items-start gap-3 px-4 pt-4 pb-3.5">

                        {/* Icon container */}
                        <div className={`mt-0.5 shrink-0 ${icon}`}>
                            <ToastIcon type={type} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 leading-snug">
                                {message}
                            </p>
                            {options?.description && (
                                <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                                    {options.description}
                                </p>
                            )}
                        </div>

                        {/* Dismiss button */}
                        {options?.position !== "bottom-left" &&
                            options?.position !== "bottom-right" && (
                                <button
                                    onClick={() => toast.dismiss(t)}
                                    className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5 cursor-pointer"
                                    aria-label="Dismiss"
                                >
                                    <CircleX size={16} />
                                </button>
                            )}
                    </div>

                    {/* Bottom strip — subtle type indicator */}
                    <div className="flex items-center gap-1.5 px-4 pb-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot} opacity-60`} />
                        <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-medium">
                            {type}
                        </span>
                    </div>
                </div>
            </div>
        ),
        {
            duration: options?.duration || DEFAULT_DURATION,
            position: options?.position || DEFAULT_POSITION,
            style: { width: "100%" },
        }
    );
};

export const dismissToast = (id: string | number) => {
    toast.dismiss(id);
};

// Convenience methods
export const toastSuccess = (message: string, options?: ToastOptions) =>
    showToast("success", message, options);

export const toastError = (message: string, options?: ToastOptions) =>
    showToast("error", message, options);

export const toastWarning = (message: string, options?: ToastOptions) =>
    showToast("warning", message, options);

export const toastInfo = (message: string, options?: ToastOptions) =>
    showToast("info", message, options);

export const toastLoading = (message: string, options?: ToastOptions) =>
    showToast("loading", message, options);

export const toastUpdate = (
    id: string | number,
    type: ToastType,
    message: string,
    options?: ToastOptions
) => {
    dismissToast(id);
    return showToast(type, message, options);
};
