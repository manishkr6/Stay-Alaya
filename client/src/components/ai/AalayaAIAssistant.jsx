import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  MapPin,
  CheckCircle2,
  Minimize2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { chatWithAalayaAI } from '../../services/aiService';

export default function AalayaAIAssistant() {
  const location = useLocation();
  const isPGDetail = location.pathname.startsWith('/pg/');
  const { pgs } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Khamzang! 🙏 I am **Aalaya AI**, your Sikkim PG & Roommate Matchmaker. Tell me what you're looking for (e.g. area in Sikkim, budget, room sharing, or nearby college like ICFAI University, SMIT, or Sikkim University) and I'll find the best verified PGs for you!",
      recommendedIds: [],
    },
  ]);

  const quickPrompts = [
    'PG near ICFAI University with Food & WiFi',
    'Boys PG near SMIT Majitar under ₹7,000',
    'Girls PG in Tadong with Food & WiFi',
    'Single room in Gangtok for working professional',
    'Best budget PGs for Sikkim University students',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-6); // last 3 turns
      const result = await chatWithAalayaAI(text, history, pgs);

      const aiMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        text: result.text,
        recommendedIds: result.recommendedIds || [],
        isAiPowered: result.isAiPowered,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: "I ran into a temporary issue connecting to the AI service. Here are our verified listings in Sikkim below, or try asking in a slightly different way!",
          recommendedIds: pgs.slice(0, 2).map((p) => String(p.id)),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: "Chat cleared! How can I help you find your next PG in Sikkim today?",
        recommendedIds: [],
      },
    ]);
  };

  // Find full PG object from recommendedIds
  const getPgsByIds = (ids = []) => {
    return pgs.filter((p) => ids.includes(String(p.id)));
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`fixed ${
            isPGDetail ? 'bottom-20 sm:bottom-6' : 'bottom-6'
          } right-4 sm:right-6 z-50 group flex items-center gap-2 bg-[#0f2547] hover:bg-[#0b192c] text-white pl-3.5 pr-4 sm:pl-4 sm:pr-5 py-2.5 sm:py-3 rounded-full shadow-2xl hover:shadow-amber-500/10 hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-amber-400/50`}
          aria-label="Open Aalaya AI Assistant"
        >
          <div className="relative">
            <Sparkles size={18} className="animate-spin-slow text-[#f5a623]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="font-semibold text-xs sm:text-sm tracking-wide text-white">Ask Aalaya AI</span>
        </button>
      )}

      {/* AI Assistant Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? `${isPGDetail ? 'bottom-20 sm:bottom-6' : 'bottom-6'} right-4 sm:right-6 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3`
              : 'bottom-2 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[420px] max-h-[90vh] sm:max-h-[85vh] h-[560px] sm:h-[640px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden backdrop-blur-xl'
          }`}
        >
          {/* Header */}
          <div className="bg-[#0f2547] text-white p-4 flex items-center justify-between shadow-md border-b border-amber-400/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#0b192c] border border-amber-400/40 flex items-center justify-center text-[#f5a623] shadow-inner">
                <Sparkles size={18} className="text-[#f5a623]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-none text-white">Aalaya AI</h3>
                  <span className="text-[10px] bg-amber-400/20 text-[#f5a623] px-2 py-0.5 rounded-full font-semibold border border-amber-400/30">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">Sikkim PG Matchmaker</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Minimized Bar Content */}
          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between cursor-pointer pt-1"
            >
              <span className="text-xs text-slate-600 font-medium truncate">Click to expand chat</span>
              <Sparkles size={14} className="text-primary-600" />
            </div>
          ) : (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  const recommendedPgs = !isUser && m.recommendedIds?.length ? getPgsByIds(m.recommendedIds) : [];

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-[#0f2547] border border-amber-400/40 text-[#f5a623] flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs">
                          <Bot size={14} />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                            isUser
                              ? 'bg-[#0f2547] text-white rounded-tr-sm'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm'
                          }`}
                        >
                          <div className="whitespace-pre-line">{m.text}</div>
                        </div>

                        {/* Interactive PG Listing Cards inside Chat */}
                        {recommendedPgs.length > 0 && (
                          <div className="space-y-2 pt-1 w-full">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Sparkles size={11} className="text-[#f5a623]" /> Matching PGs Found:
                            </p>
                            {recommendedPgs.map((pg) => (
                              <div
                                key={pg.id}
                                className="bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-sm hover:shadow-md transition-all flex gap-3 items-center group"
                              >
                                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                  {pg.images?.[0] ? (
                                    <img
                                      src={pg.images[0]}
                                      alt={pg.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                                      PG
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h4 className="font-bold text-slate-900 text-xs truncate">{pg.title}</h4>
                                    {pg.isVerified && (
                                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-0.5 truncate">
                                    <MapPin size={10} className="text-[#0f2547] shrink-0" />
                                    {pg.location?.area || 'Sikkim'}, {pg.location?.city || ''}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="font-bold text-xs text-[#0f2547]">
                                      ₹{pg.price.toLocaleString('en-IN')}
                                      <span className="text-[10px] font-normal text-slate-400">/mo</span>
                                    </span>
                                    <Link
                                      to={`/pg/${pg.id}`}
                                      onClick={() => setIsOpen(false)}
                                      className="text-[11px] font-semibold text-[#0f2547] hover:text-[#f5a623] flex items-center gap-0.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60"
                                    >
                                      View <ExternalLink size={10} />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs font-semibold">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2.5 items-center text-slate-500 text-xs py-2">
                    <div className="w-7 h-7 rounded-full bg-[#0f2547] border border-amber-400/40 text-[#f5a623] flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                      <Sparkles size={14} />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 rounded-tl-sm flex items-center gap-2 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-slate-500 text-xs ml-1">Analyzing Sikkim PGs...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              {messages.length <= 2 && (
                <div className="p-3 bg-white border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Quick Suggestions:
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        onClick={() => handleSend(qp)}
                        className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-200/60"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="Ask e.g. 'Rooms near ICFAI University' or 'Girls PG in Tadong'..."
                  className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
