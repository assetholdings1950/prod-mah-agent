"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, Search, Send, Loader2, RefreshCw, ChevronLeft, Settings, Check, CheckCheck
} from "lucide-react";
import { useAgent } from "../../../components/AgentContext";
import { api, apiFetch } from "../../../utils/api";
import { toastError } from "../../../utils/toast-message/taost-message";
import type { Client } from "@/types";

type ChatMessage = {
  _id: string;
  client: string;
  agent: string;
  sender: "client" | "agent";
  senderName?: string;
  message: string;
  read?: boolean;
  createdAt: string;
};

export default function AgentConversationsPage() {
  const { user } = useAgent();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialClientId = searchParams.get("clientId") || "";

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch agent's clients
  const loadClients = useCallback(async () => {
    if (!user?._id) return;
    setLoadingClients(true);
    try {
      const res = await api.getClients({ agent: user._id, limit: 100 });
      if (res && res.status) {
        const list = res.clients?.docs || res.data?.docs || (Array.isArray(res.data) ? res.data : []);
        setClients(list);

        // Preselect client if clientId is in query or pick first
        if (initialClientId) {
          const matched = list.find((c) => c._id === initialClientId);
          if (matched) {
            setSelectedClient(matched);
            setMobileView("chat");
          } else if (list.length > 0) {
            setSelectedClient(list[0]);
          }
        } else if (list.length > 0) {
          setSelectedClient((prev) => prev || list[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching client list:", err);
      toastError("Failed to fetch client directory.");
    } finally {
      setLoadingClients(false);
    }
  }, [user?._id, initialClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Fetch unread message counts for all assigned clients
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await apiFetch<{ data?: Record<string, number> }>(`/chat/unread?agentId=${user._id}`);
      if (res && res.status && res.data) {
        setUnreadMap(res.data);
      }
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 4000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Fetch conversation messages with selected client
  const fetchMessages = useCallback(async (showLoading = false) => {
    if (!selectedClient || !user?._id) return;
    if (showLoading) setLoadingMessages(true);
    try {
      const res = await apiFetch<ChatMessage[]>(
        `/chat/messages?clientId=${selectedClient._id}&agentId=${user._id}&reader=agent`
      );
      if (res && res.status && Array.isArray(res.data)) {
        setMessages(res.data);
        // Clear unread count for current client
        setUnreadMap((prev) => ({ ...prev, [selectedClient._id]: 0 }));
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [selectedClient, user?._id]);

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedClient || !user?._id || sending) return;

    setSending(true);
    try {
      const res = await apiFetch<ChatMessage>(`/chat/messages`, {
        method: "POST",
        body: JSON.stringify({
          clientId: selectedClient._id,
          agentId: user._id,
          message: input.trim(),
          sender: "agent",
        }),
      });

      if (res && res.status && res.data) {
        setMessages((prev) => [...prev, res.data as ChatMessage]);
        setInput("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toastError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const id = (c.clientId || "").toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col min-h-0 overflow-hidden font-sans space-y-3">
      {/* Top Header Bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 bg-white px-3.5 py-3 sm:px-5 sm:py-3.5 border border-slate-200/80 rounded-2xl shadow-sm min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-navy tracking-tight leading-tight truncate">
              Client Conversations
            </h1>
            <p className="hidden sm:block text-xs text-navy-light/60 font-medium truncate">
              Direct support chat with your assigned investors and clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              loadClients();
              if (selectedClient) fetchMessages(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-navy font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Container: Flex on mobile, Grid on desktop */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 overflow-hidden">
        {/* Left Directory Panel */}
        <div
          className={`flex-1 min-h-0 min-w-0 lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden ${
            mobileView === "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2 shrink-0 min-w-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/10 font-medium shadow-xs min-w-0"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>Clients ({filteredClients.length})</span>
              <span>Assigned</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {loadingClients ? (
              <div className="flex h-40 items-center justify-center text-slate-400 text-xs">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                No clients found matching query.
              </div>
            ) : (
              filteredClients.map((c) => {
                const isSelected = selectedClient?._id === c._id;
                const clientName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email;
                const unreadCount = unreadMap[c._id] || 0;

                return (
                  <button
                    key={c._id}
                    onClick={() => {
                      setSelectedClient(c);
                      setMobileView("chat");
                      router.replace(`/dashboard/conversations?clientId=${c._id}`);
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 text-left transition cursor-pointer min-w-0 ${
                      isSelected
                        ? "bg-navy text-white shadow-sm"
                        : "hover:bg-slate-50 text-navy"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-white/15 text-white border border-white/20"
                            : "bg-navy/5 text-navy border border-slate-200"
                        }`}
                      >
                        {c.firstName?.charAt(0) || "C"}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-white font-extrabold text-[9px] shadow-sm animate-pulse border border-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`truncate text-xs font-extrabold ${isSelected ? "text-white" : "text-navy"}`}>
                          {clientName}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {unreadCount > 0 && !isSelected && (
                            <span className="inline-block bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                              {unreadCount} unread
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 max-w-[80px] truncate ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500 font-bold"
                            }`}
                          >
                            #{c.clientId || "ID"}
                          </span>
                        </div>
                      </div>
                      <p className={`truncate text-[11px] mt-0.5 ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                        {c.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div
          className={`flex-1 min-h-0 min-w-0 lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedClient ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => setMobileView("list")}
                    className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 transition cursor-pointer shrink-0"
                    title="Back to Clients List"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                    {selectedClient.firstName?.charAt(0) || "C"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-xs sm:text-sm font-extrabold text-navy truncate">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h3>
                      <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded shrink-0">
                        #{selectedClient.clientId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{selectedClient.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/clients/${selectedClient._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy/5 hover:bg-navy/10 text-navy font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Manage Profile</span>
                  </Link>
                </div>
              </div>

              {/* Chat History */}
              <div ref={chatContainerRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 bg-slate-50/30 scrollbar-thin">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400 text-xs font-semibold">
                    <Loader2 className="h-5 w-5 animate-spin mr-2 text-navy" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-navy/40">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-navy">Start a Conversation</p>
                    <p className="text-[11px] text-slate-400 max-w-[280px]">
                      Send a message to reach out to {selectedClient.firstName || "this investor"}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAgent = msg.sender === "agent";
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isAgent ? "items-end" : "items-start"} min-w-0`}
                      >
                        <span className="mb-1 text-[10px] text-slate-400 font-semibold px-1 max-w-full truncate">
                          {isAgent
                            ? "You (Account Manager)"
                            : msg.senderName || `${selectedClient.firstName || ""} ${selectedClient.lastName || ""}`.trim()}
                        </span>
                        <div
                          className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs min-w-0 ${
                            isAgent
                              ? "rounded-tr-none bg-navy text-white"
                              : "rounded-tl-none bg-white border border-slate-200 text-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <div
                            className={`mt-1 flex items-center justify-end gap-1.5 text-[9px] ${
                              isAgent ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            <span>{formattedTime}</span>
                            {isAgent && (
                              msg.read ? (
                                <span className="flex items-center gap-0.5 text-cyan-300 font-extrabold" title="Read by Client">
                                  <CheckCheck className="h-3 w-3 inline" />
                                  <span>Seen</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-slate-300/80 font-medium" title="Delivered">
                                  <Check className="h-3 w-3 inline" />
                                  <span>Delivered</span>
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

              {/* Chat Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-3.5 border-t border-slate-100 bg-white flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Type a message to ${selectedClient.firstName || "client"}...`}
                  className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/40 font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="h-10 px-4 rounded-xl bg-navy text-white text-xs font-bold flex items-center gap-1.5 hover:bg-navy-light disabled:opacity-40 transition cursor-pointer shadow-sm shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <MessageSquare className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-bold text-navy">No Client Selected</p>
              <p className="text-xs text-slate-400 max-w-[260px]">
                Choose an investor from the left directory panel to view or start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
