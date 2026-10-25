import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  User,
  MapPin,
  CheckCircle2,
  Minimize2,
  Maximize2,
  ExternalLink,
  RotateCcw,
  ChevronRight,
  Mic,
} from 'lucide-react';

import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { chatWithAalayaAI } from '../../services/aiService';

// Helper to format inline markdown (e.g. **bold**, *italic*)
function formatInline(text, isUser = false) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);
      return (
        <strong
          key={index}
          className={isUser ? 'font-bold text-amber-200' : 'font-bold text-[#0f2547]'}
        >
          {boldContent}
        </strong>
      );
    }
    return part;
  });
}

// Helper to render structured markdown messages (paragraphs, bullet lists, numbered lists)
function FormattedMessage({ text, isUser }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let isNumbered = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-0.5">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 mt-0.5 ${
                    isUser ? 'bg-amber-400 text-[#0f2547]' : 'bg-[#0f2547] text-white'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1">{formatInline(item, isUser)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-0.5">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    isUser ? 'bg-amber-300' : 'bg-amber-500'
                  }`}
                />
                <span className="flex-1">{formatInline(item, isUser)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      isNumbered = false;
    }
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.*)$/);
    const numberMatch = trimmed.match(/^\d+[\.\)]\s+(.*)$/);

    if (bulletMatch) {
      if (isNumbered) flushList();
      isNumbered = false;
      currentList.push(bulletMatch[1]);
    } else if (numberMatch) {
      if (!isNumbered && currentList.length > 0) flushList();
      isNumbered = true;
      currentList.push(numberMatch[1]);
    } else {
      flushList();
      elements.push(
        <p key={`p-${lineIndex}`} className="mb-2 last:mb-0 leading-relaxed">
          {formatInline(trimmed, isUser)}
        </p>
      );
    }
  });

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

export default function AalayaAIAssistant() {
  const location = useLocation();
  const isPGDetail = location.pathname.startsWith('/pg/');
  const { pgs } = useData();
  const { currentUser } = useAuth();
  const userPhoto = currentUser?.avatar_url || currentUser?.avatar || '';
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Namaste! 🙏 Welcome to **Stay Aalaya AI**, your Sikkim PG & Roommate Matchmaker.\n\nTell me what you're looking for (e.g. area in Sikkim, budget, room sharing, or nearby college like ICFAI University, SMIT, or Sikkim University) and I'll find the best verified PGs for you!",
      recommendedIds: [],
    },
  ]);

  const quickPrompts = [
    { label: 'ICFAI University', query: 'PG near ICFAI University with Food & WiFi', icon: '🎓' },
    { label: 'SMIT Majitar', query: 'Boys PG near SMIT Majitar under ₹7,000', icon: '🏔️' },
    { label: 'Girls PG Tadong', query: 'Girls PG in Tadong with Food & WiFi', icon: '👭' },
    { label: 'Single Rooms', query: 'Single room in Gangtok for working professional', icon: '🛏️' },
    { label: 'Budget PGs', query: 'Best budget PGs for Sikkim University students under ₹6,000', icon: '💰' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, loading]);

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
        text: "Namaste! 🙏 Chat cleared! How can I help you find your next PG in Sikkim today?",
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
      {/* Floating Trigger Button - Circular Logo */}
      {!isOpen && (
        <div
          className={`fixed ${
            isPGDetail ? 'bottom-10 sm:bottom-25' : 'bottom-7 sm:bottom-20'
          } right-3 sm:right-6 z-40 flex items-center group`}
        >
          {/* Subtle hover tooltip badge */}
          <div className="hidden sm:block mr-2.5 px-3 py-1.5 rounded-full bg-[#0f2547] text-white text-xs font-medium shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-x-2 group-hover:translate-x-0 border border-amber-400/30">
            <span className="text-amber-400 font-semibold">Ask AI:</span> Find PGs in Sikkim
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-2 sm:ring-3 ring-amber-400/80 hover:ring-amber-500 p-1 flex items-center justify-center cursor-pointer relative shrink-0"
            aria-label="Open Stay Aalaya AI Assistant"
            title="Stay Aalaya AI"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center bg-white">
              <img
                src="/chatbot-logo.png?v=3"
                alt="Stay Aalaya AI"
                className="w-full h-full max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = '/logo1.png';
                }}
              />
            </div>

            {/* Active Status Pulse Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          </button>
        </div>
      )}

      {/* AI Assistant Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? `${isPGDetail ? 'bottom-24 sm:bottom-10' : 'bottom-7 sm:bottom-10'} right-3 sm:right-6 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-black/5`
              : 'bottom-3 sm:bottom-8 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[430px] max-h-[92vh] sm:max-h-[86vh] h-[580px] sm:h-[660px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden ring-1 ring-black/5'
          }`}
        >
          {/* Brand Top Gradient Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#0f2547] via-[#1d427b] to-[#f5a623]" />

          {/* Header */}
          <div className="bg-[#0f2547] text-white px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-sm border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-amber-400/60 p-0.5 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img
                  src="/chatbot-logo.png?v=3"
                  alt="Stay Aalaya AI"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo1.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight text-white tracking-tight">Stay Aalaya AI</h3>
                  <span className="text-[9px] bg-amber-400/20 text-[#f5a623] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border border-amber-400/30">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] text-slate-300 font-medium">Sikkim PG & Roommate Guide</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5 text-slate-300">
              <button
                type="button"
                onClick={handleClearChat}
                title="Restart conversation"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                type="button"
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
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-700 font-semibold">Click to resume chat</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-100 p-0.5 border border-amber-400/40">
                <img
                  src="/chatbot-logo.png?v=3"
                  alt="Aalaya AI"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo1.png';
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  const recommendedPgs = !isUser && m.recommendedIds?.length ? getPgsByIds(m.recommendedIds) : [];

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2 sm:gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-white border border-amber-400/50 p-0.5 flex items-center justify-center shrink-0 mt-0.5 shadow-xs overflow-hidden">
                          <img
                            src="/chatbot-logo.png?v=3"
                            alt="Aalaya AI"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/logo1.png';
                            }}
                          />
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-[82%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                        {/* Bubble */}
                        <div
                          className={`relative p-3 sm:p-3.5 rounded-2xl text-xs sm:text-[13px] shadow-xs ${
                            isUser
                              ? 'bg-gradient-to-r from-[#0f2547] to-[#1a3c6e] text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          }`}
                        >
                          {/* Assistant speech tail (curved arrow pointing to chatbot mascot) */}
                          {!isUser && (
                            <div className="absolute -left-[9px] top-2.5 w-[10px] h-[14px] pointer-events-none overflow-visible">
                              <svg
                                viewBox="0 0 10 14"
                                className="w-[10px] h-[14px] overflow-visible"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10 0 C7 0.5, 2 2.5, 0 6 C3 6.5, 7 9, 10 12 V0Z"
                                  fill="#ffffff"
                                />
                                <path
                                  d="M10 0 C7 0.5, 2 2.5, 0 6 C3 6.5, 7 9, 10 12"
                                  stroke="#e2e8f0"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          )}

                          {/* User speech tail (curved arrow pointing to user avatar) */}
                          {isUser && (
                            <div className="absolute -right-[9px] top-2.5 w-[10px] h-[14px] pointer-events-none overflow-visible">
                              <svg
                                viewBox="0 0 10 14"
                                className="w-[10px] h-[14px] overflow-visible"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M0 0 C3 0.5, 8 2.5, 10 6 C7 6.5, 3 9, 0 12 V0Z"
                                  fill="#1a3c6e"
                                />
                              </svg>
                            </div>
                          )}

                          <FormattedMessage text={m.text} isUser={isUser} />
                        </div>

                        {/* Interactive PG Recommendation Cards */}
                        {recommendedPgs.length > 0 && (
                          <div className="space-y-2 pt-1 w-full">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Sparkles size={12} className="text-[#f5a623]" /> Verified Sikkim PGs:
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {recommendedPgs.length} matched
                              </span>
                            </div>

                            {recommendedPgs.map((pg) => (
                              <div
                                key={pg.id}
                                className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs hover:shadow-md hover:border-amber-400/60 transition-all flex gap-3 items-center group"
                              >
                                <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                                  {pg.images?.[0] ? (
                                    <img
                                      src={pg.images[0]}
                                      alt={pg.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-[10px] font-semibold">
                                      PG
                                    </div>
                                  )}
                                  {pg.isVerified && (
                                    <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                                      <CheckCircle2 size={9} />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-[#0f2547] transition-colors">
                                      {pg.title}
                                    </h4>
                                  </div>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                                    <MapPin size={10} className="text-[#0f2547] shrink-0" />
                                    <span>
                                      {pg.location?.area || 'Sikkim'}, {pg.location?.city || ''}
                                    </span>
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100">
                                    <span className="font-extrabold text-xs text-[#0f2547]">
                                      ₹{Number(pg.price).toLocaleString('en-IN')}
                                      <span className="text-[10px] font-normal text-slate-400">/mo</span>
                                    </span>
                                    <Link
                                      to={`/pg/${pg.id}`}
                                      onClick={() => setIsOpen(false)}
                                      className="text-[10px] font-bold text-[#0f2547] hover:text-[#f5a623] flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60 transition-colors"
                                    >
                                      View PG <ChevronRight size={10} />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#0f2547] text-[#f5a623] border border-amber-400/50 flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-xs font-bold">
                          {userPhoto ? (
                            <img
                              src={userPhoto}
                              alt={currentUser?.name || 'You'}
                              className="w-full h-full object-cover"
                            />
                          ) : currentUser?.name ? (
                            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                          ) : (
                            <User size={13} className="text-white" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* AI Thinking Indicator */}
                {loading && (
                  <div className="flex gap-2.5 items-center text-slate-500 text-xs py-1.5 animate-in fade-in duration-200">
                    <div className="w-7 h-7 rounded-full bg-white border border-amber-400/50 p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      <img
                        src="/chatbot-logo.png?v=3"
                        alt="Aalaya AI"
                        className="w-full h-full object-contain animate-pulse"
                        onError={(e) => {
                          e.currentTarget.src = '/logo1.png';
                        }}
                      />
                    </div>
                    <div className="relative bg-white border border-slate-200/90 rounded-2xl rounded-tl-none px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
                      {/* Assistant speech tail */}
                      <div className="absolute -left-[9px] top-2.5 w-[10px] h-[14px] pointer-events-none overflow-visible">
                        <svg
                          viewBox="0 0 10 14"
                          className="w-[10px] h-[14px] overflow-visible"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10 0 C7 0.5, 2 2.5, 0 6 C3 6.5, 7 9, 10 12 V0Z"
                            fill="#ffffff"
                          />
                          <path
                            d="M10 0 C7 0.5, 2 2.5, 0 6 C3 6.5, 7 9, 10 12"
                            stroke="#e2e8f0"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>

                      <div className="w-1.5 h-1.5 bg-[#0f2547] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#f5a623] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-[#0f2547] rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="text-slate-600 text-xs font-medium ml-1">Analyzing Sikkim PGs...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions Chips */}
              {messages.length <= 3 && (
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/70">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500" /> Suggestions:
                    </span>
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp.label}
                        type="button"
                        onClick={() => handleSend(qp.query)}
                        className="text-[11px] whitespace-nowrap bg-white hover:bg-amber-50 hover:text-[#0f2547] hover:border-amber-400/70 text-slate-700 px-2.5 py-1 rounded-full transition-all border border-slate-200 shadow-2xs shrink-0 flex items-center gap-1 active:scale-95"
                      >
                        <span>{qp.icon}</span>
                        <span className="font-medium">{qp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modern Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2 bg-slate-100/80 rounded-2xl px-3.5 py-1 border border-slate-200/90 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-inner"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask e.g. 'Rooms near ICFAI' or 'Girls PG Tadong'..."
                    className="flex-1 text-xs sm:text-[13px] bg-transparent text-slate-800 placeholder-slate-400 py-2 px-0 border-0 border-transparent focus:border-transparent ring-0 focus:ring-0 outline-none focus:outline-none shadow-none"
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new CustomEvent('open-aalaya-voice-assistant'));
                    }}
                    className="p-2 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-100/70 transition-all cursor-pointer shrink-0"
                    title="Switch to Full-Screen AI Voice Assistant"
                  >
                    <Mic size={16} />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-[#1a3c6e] text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>

                </form>

                {/* Micro Footer */}
                <div className="flex items-center justify-between px-1.5 pt-1.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Verified Sikkim Listings & Budget Matching
                  </span>
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="hover:text-rose-600 transition-colors flex items-center gap-1 font-medium"
                    title="Reset conversation"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

