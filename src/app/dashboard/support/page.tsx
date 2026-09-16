"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgent } from "../../../components/AgentContext";
import { apiFetch } from "../../../utils/api";
import { toastError } from "../../../utils/toast-message/taost-message";
import {
  Headset, Send, Loader2, RefreshCw, Check, CheckCheck, ShieldCheck, Clock
} from "lucide-react";

type AgentAdminMessage = {
  _id: string;
  agent: string;
  sender: "agent" | "admin";
  senderName?: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function AgentSupportChatPage() {
  const { user } = useAgent();
  const [messages, setMessages] = useState<AgentAdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!user?._id) return;
    if (showLoading) setLoadingMessages(true);
    try {
      const res = await apiFetch<AgentAdminMessage[]>(
        `/chat/agent-admin/messages?agentId=${user._id}&reader=agent`
      );
      if (res && res.status && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Error loading agent-admin messages:", err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchMessages(true);
    // Poll every 4 seconds (< 5s as requested) for real-time live message syncing
    const interval = setInterval(() => fetchMessages(false), 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?._id || sending) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await apiFetch<AgentAdminMessage>(`/chat/agent-admin/messages`, {
        method: "POST",
        body: JSON.stringify({
          agentId: user._id,
          message: messageText,
          sender: "agent",
        }),
      });

      if (res && res.status && res.data) {
        setMessages((prev) => [...prev, res.data as AgentAdminMessage]);
      } else {
        // Fallback fetch
        fetchMessages(false);
      }
    } catch (err) {
      console.error("Failed to post support message:", err);
      toastError("Failed to send message to support desk.");
      setInput(messageText); // restore on failure
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col min-h-0 overflow-hidden font-sans space-y-3">
      {/* Top Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-3.5 border border-slate-200/80 rounded-2xl shadow-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-navy to-blue-900 text-white shrink-0 shadow-md">
            <Headset className="h-5 w-5 text-blue-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-navy tracking-tight leading-tight truncate">
                Admin Support Desk
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Live</span>
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">
              Direct priority conversation channel with Merlion Admin Desk for KYC, Commissions & Payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchMessages(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-navy font-bold rounded-xl text-xs transition cursor-pointer"
            title="Refresh Conversation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="flex-1 min-h-0 min-w-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat Stream Banner */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0 min-w-0 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="truncate">Encrypted Priority Agent-to-Admin Support Line</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0">
          </div>
        </div>

        {/* Message Stream */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 bg-slate-50/30 scrollbar-thin"
        >
          {loadingMessages && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400 text-xs font-semibold">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-navy" /> Connecting to Support Desk...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-navy shadow-inner">
                <Headset className="h-7 w-7 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-navy">Welcome to Agent Support</p>
              <p className="text-xs text-slate-500 max-w-[320px] leading-relaxed">
                Need help with investor verification, commission calculations, or payout requests? Send a message below to start a chat with Admin Support.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOut = msg.sender === "agent";
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg._id}
                  className={`flex flex-col ${isOut ? "items-end" : "items-start"} min-w-0`}
                >
                  <span className="mb-1 text-[10px] text-slate-400 font-semibold px-1 max-w-full truncate">
                    {isOut ? "You (Agent)" : msg.senderName || "Admin Support"}
                  </span>

                  <div
                    className={`max-w-[88%] sm:max-w-[76%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs min-w-0 ${isOut
                      ? "rounded-tr-none bg-navy text-white"
                      : "rounded-tl-none bg-white border border-slate-200/90 text-slate-800"
                      }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                    <div
                      className={`mt-1 flex items-center justify-end gap-1.5 text-[9px] ${isOut ? "text-slate-300" : "text-slate-400"
                        }`}
                    >
                      <span>{formattedTime}</span>

                      {/* Read status for Outgoing Agent messages */}
                      {isOut && (
                        msg.read ? (
                          <span
                            className="flex items-center gap-0.5 text-cyan-300 font-extrabold"
                            title="Seen by Admin"
                          >
                            <CheckCheck className="h-3 w-3 inline" />
                            <span>Seen</span>
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-0.5 text-slate-300/80 font-medium"
                            title="Not Seen yet by Admin"
                          >
                            <Check className="h-3 w-3 inline" />
                            <span>Not Seen</span>
                          </span>
                        )
                      )}

                      {/* Read status for Incoming Admin messages */}
                      {!isOut && (
                        msg.read ? (
                          <span className="flex items-center gap-0.5 text-emerald-600 font-bold">
                            <CheckCheck className="h-3 w-3 inline" />
                            <span>Read</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-rose-500 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            <span>New</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Composer Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-3.5 border-t border-slate-100 bg-white flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message to Admin Support..."
            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/40 font-medium shadow-xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="h-10 px-4.5 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-navy-light disabled:opacity-40 transition cursor-pointer shadow-sm shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send Message</span>
          </button>
        </form>
      </div>
    </div>
  );
}
