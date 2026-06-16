import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, MessageCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export default function Messages() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [networkIssue, setNetworkIssue] = useState("");
  const shownErrorRef = useRef("");
  const [nowTick, setNowTick] = useState(Date.now());

  const queryOtherUserId = searchParams.get("userId");
  const queryPgId = searchParams.get("pgId");

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  const formatLastSeen = (value) => {
    if (!value) return "Offline";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Offline";
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins <= 0) return "Last seen just now";
    if (diffMins < 60) return `Last seen ${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Last seen ${diffDays} day ago`;
    return `Last seen ${d.toLocaleString()}`;
  };

  const isUserActive = (value) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    // Consider active only if seen within last 45 seconds.
    return nowTick - d.getTime() <= 45_000;
  };

  const getErrorMessage = (e, fallback) =>
    e?.response?.data?.message ||
    e?.response?.data?.detail ||
    e?.message ||
    fallback;

  const showErrorOnce = (message) => {
    if (!message) return;
    if (shownErrorRef.current === message) return;
    shownErrorRef.current = message;
    toast.error(message);
  };

  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get("/chat/conversations");
      const list = data?.data || [];
      setConversations(list);
      setNetworkIssue("");
      shownErrorRef.current = "";
      if (!activeConversationId && list.length > 0) setActiveConversationId(list[0].id);
    } catch (e) {
      const message = getErrorMessage(e, "Failed to load conversations");
      setNetworkIssue(message);
      showErrorOnce(message);
    } finally {
      setLoadingList(false);
    }
  };

  const ensureConversationFromQuery = async () => {
    if (!queryOtherUserId) return;
    try {
      const { data } = await api.post("/chat/conversations", {
        otherUserId: queryOtherUserId,
        pgId: queryPgId || null,
      });
      const conversationId = data?.data?.id;
      if (conversationId) {
        setActiveConversationId(conversationId);
        setSearchParams({});
      }
    } catch (e) {
      const message = getErrorMessage(e, "Unable to start chat");
      setNetworkIssue(message);
      showErrorOnce(message);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: { page: 1, limit: 200 },
      });
      setMessages(data?.data || []);
      await api.put(`/chat/conversations/${conversationId}/read`);
      setNetworkIssue("");
      shownErrorRef.current = "";
    } catch (e) {
      const message = getErrorMessage(e, "Failed to load messages");
      setNetworkIssue(message);
      showErrorOnce(message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!activeConversationId || !text.trim()) return;
    try {
      const { data } = await api.post(`/chat/conversations/${activeConversationId}/messages`, {
        text: text.trim(),
      });
      const sent = data?.data;
      if (sent) setMessages((prev) => [...prev, sent]);
      setText("");
      await loadConversations();
    } catch (e) {
      const message = getErrorMessage(e, "Failed to send message");
      setNetworkIssue(message);
      showErrorOnce(message);
    }
  };

  const handleDeleteMessage = async (messageId, mode = "me") => {
    try {
      await api.delete(`/chat/messages/${messageId}`, { data: { mode } });
      await loadMessages(activeConversationId);
      await loadConversations();
      toast.success(mode === "everyone" ? "Deleted for everyone" : "Deleted for you");
    } catch (e) {
      const message = getErrorMessage(e, "Failed to delete message");
      setNetworkIssue(message);
      showErrorOnce(message);
    }
  };

  useEffect(() => {
    (async () => {
      await ensureConversationFromQuery();
      await loadConversations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const timer = setInterval(() => {
      loadMessages(activeConversationId);
      loadConversations();
    }, 8000);
    return () => clearInterval(timer);
  }, [activeConversationId]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen bg-slate-50 pt-20 lg:pt-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-9.5rem)]">
          <aside className="border-r border-slate-100">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Messages</h2>
              <p className="text-xs text-slate-500 mt-1">Chat with owners and users</p>
            </div>
            <div className="p-2 space-y-1 h-[calc(100%-5rem)] overflow-y-auto">
              {loadingList && <p className="text-xs text-slate-500 px-2 py-1">Loading...</p>}
              {!loadingList && conversations.length === 0 && (
                <p className="text-sm text-slate-500 p-3">No conversations yet.</p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    c.id === activeConversationId ? "bg-primary-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {c.otherUser?.name || "User"}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="text-[10px] bg-primary-600 text-white rounded-full px-2 py-0.5">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5">
                    {isUserActive(c.otherUser?.lastSeenAt) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {formatLastSeen(c.otherUser?.lastSeenAt)}
                      </span>
                    )}
                  </div>
                  {c.pg?.title && <p className="text-[11px] text-slate-500 truncate">PG: {c.pg.title}</p>}
                  <p className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessage || "Start chatting"}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col min-h-0">
            {networkIssue && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 text-red-700 text-xs">
                Connection issue: {networkIssue}
              </div>
            )}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  {activeConversation?.otherUser?.name || "Select a conversation"}
                </h3>
                {isUserActive(activeConversation?.otherUser?.lastSeenAt) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
              </div>
              {activeConversation?.pg?.title && (
                <p className="text-xs text-slate-500 mt-0.5">Regarding: {activeConversation.pg.title}</p>
              )}
              {activeConversation?.otherUser && (
                <p className="text-xs text-slate-500 mt-1">
                  {isUserActive(activeConversation.otherUser.lastSeenAt) ? "Active now" : formatLastSeen(activeConversation.otherUser.lastSeenAt)}
                </p>
              )}
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50 min-h-0">
              {!activeConversationId && (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  <div className="text-center">
                    <MessageCircle className="mx-auto mb-2 text-slate-400" size={28} />
                    Select a conversation to start chatting.
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      m.isMine ? "bg-primary-600 text-white rounded-br-md" : "bg-white border border-slate-100 text-slate-700 rounded-bl-md"
                    }`}
                  >
                    <div className="max-h-32 overflow-y-auto pr-1">
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                    <div className={`mt-1.5 flex items-center gap-3 ${m.isMine ? "justify-end" : "justify-start"}`}>
                      {m.isMine && (
                        <span className={`text-[10px] ${m.isMine ? "text-white/80" : "text-slate-400"}`}>
                          {m.isSeenByOther ? "Seen" : "Sent"}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteMessage(m.id, "me")}
                        className={`text-[10px] inline-flex items-center gap-1 ${m.isMine ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                      {m.isMine && (
                        <button
                          onClick={() => handleDeleteMessage(m.id, "everyone")}
                          className="text-[10px] text-white/80 hover:text-white"
                        >
                          Delete for everyone
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!activeConversationId || !currentUser}
                  placeholder={activeConversationId ? "Type your message..." : "Select conversation first"}
                  rows={1}
                  className="input-field text-sm resize-none min-h-[44px] max-h-32 overflow-y-auto"
                />
                <button onClick={handleSend} disabled={!activeConversationId || !text.trim()} className="btn-primary py-2.5 px-4">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
