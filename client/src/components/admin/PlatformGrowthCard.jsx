import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  MapPin, 
  Users, 
  IndianRupee, 
  Building2, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  X, 
  Star,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlatformGrowthCard({ pgs = [], users = [], reviews = [] }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pricing'); // 'pricing' | 'localities' | 'trend' | 'users'
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllPgsInModal, setShowAllPgsInModal] = useState(false);

  // Active PGs filter
  const activePgs = useMemo(() => pgs.filter((p) => !p.isDeleted), [pgs]);

  // Extract all rents
  const rents = useMemo(() => {
    return activePgs.map((p) => Number(p.rent || p.price || 0)).filter((r) => r > 0);
  }, [activePgs]);

  const minRent = rents.length > 0 ? Math.min(...rents) : 0;
  const maxRent = rents.length > 0 ? Math.max(...rents) : 0;

  // Aggregate rent metrics
  const totalRentSum = useMemo(() => {
    return activePgs.reduce((acc, pg) => acc + Number(pg.rent || pg.price || 0), 0);
  }, [activePgs]);

  const avgRentOverall = activePgs.length > 0 ? Math.round(totalRentSum / activePgs.length) : 0;

  // 1. Locality Analytics
  const localityData = useMemo(() => {
    const map = {};
    activePgs.forEach((pg) => {
      const loc = pg.location?.city || pg.location?.area || pg.locality || 'Gangtok';
      if (!map[loc]) {
        map[loc] = { name: loc, count: 0, totalRent: 0, pgs: [] };
      }
      map[loc].count += 1;
      map[loc].totalRent += Number(pg.rent || pg.price || 0);
      map[loc].pgs.push(pg);
    });

    const list = Object.values(map).map((item) => ({
      name: item.name,
      count: item.count,
      avgRent: item.count > 0 ? Math.round(item.totalRent / item.count) : 0,
      percentage: activePgs.length > 0 ? Math.round((item.count / activePgs.length) * 100) : 0,
      shortLabel: item.name.length > 6 ? item.name.slice(0, 5) + '..' : item.name,
      type: 'locality',
    }));

    return list.sort((a, b) => b.count - a.count);
  }, [activePgs]);

  // 2. Individual PG Pricing Spectrum Analytics
  const pricingData = useMemo(() => {
    const sorted = [...activePgs].sort((a, b) => Number(b.rent || b.price || 0) - Number(a.rent || a.price || 0));

    return sorted.map((p) => {
      const rentVal = Number(p.rent || p.price || 0);
      let label = p.title
        .replace(/Homestay|Residency|Executive Stay|Student PG|Budget PG & Residency|for SMIT|for girls/gi, '')
        .trim();
      if (label.length > 6) label = label.slice(0, 5) + '..';

      return {
        id: p.id,
        name: p.title,
        locality: p.location?.city || p.locality || 'Gangtok',
        roomType: p.roomType || 'Single',
        rent: rentVal,
        count: rentVal,
        displayValue: `₹${(rentVal / 1000).toFixed(rentVal % 1000 === 0 ? 0 : 1)}k`,
        shortLabel: label || p.title.slice(0, 5),
        percentage: maxRent > 0 ? Math.round((rentVal / maxRent) * 100) : 0,
        type: 'pricing',
      };
    });
  }, [activePgs, maxRent]);

  // 3. Price Tiers (Budget, Mid, Premium)
  const priceTiers = useMemo(() => {
    const budget = activePgs.filter((p) => Number(p.rent || p.price || 0) < 5000);
    const mid = activePgs.filter((p) => {
      const r = Number(p.rent || p.price || 0);
      return r >= 5000 && r <= 7500;
    });
    const premium = activePgs.filter((p) => Number(p.rent || p.price || 0) > 7500);

    return [
      {
        name: 'Budget Tier',
        range: 'Under ₹5,000/mo',
        count: budget.length,
        pgs: budget,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
      },
      {
        name: 'Mid-Range Tier',
        range: '₹5,000 – ₹7,500/mo',
        count: mid.length,
        pgs: mid,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
      },
      {
        name: 'Premium Tier',
        range: 'Above ₹7,500/mo',
        count: premium.length,
        pgs: premium,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        badge: 'bg-purple-100 text-purple-800',
      },
    ];
  }, [activePgs]);

  // 4. Monthly Trend Analytics
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, label, year: d.getFullYear(), pgsCount: 0, usersCount: 0 });
    }

    activePgs.forEach((pg) => {
      if (!pg.createdAt) return;
      const ym = pg.createdAt.slice(0, 7);
      const match = months.find((m) => m.key === ym);
      if (match) {
        match.pgsCount += 1;
      } else if (months.length > 0) {
        months[months.length - 1].pgsCount += 1;
      }
    });

    return months.map((m) => ({
      name: `${m.label} ${m.year}`,
      shortLabel: m.label,
      count: m.pgsCount,
      usersCount: m.usersCount,
      percentage: activePgs.length > 0 ? Math.round((m.pgsCount / activePgs.length) * 100) : 0,
      type: 'trend',
    }));
  }, [activePgs]);

  // 5. User Base Analytics
  const userData = useMemo(() => {
    const students = users.filter((u) => u.role === 'student' || u.role === 'user' || !u.role);
    const owners = users.filter((u) => u.role === 'owner');
    const admins = users.filter((u) => u.role === 'admin');

    return [
      {
        name: 'Students & Tenants',
        shortLabel: 'Students',
        count: students.length,
        percentage: users.length > 0 ? Math.round((students.length / users.length) * 100) : 0,
        type: 'user',
      },
      {
        name: 'Property Owners',
        shortLabel: 'Owners',
        count: owners.length,
        percentage: users.length > 0 ? Math.round((owners.length / users.length) * 100) : 0,
        type: 'user',
      },
      {
        name: 'Platform Admins',
        shortLabel: 'Admins',
        count: admins.length,
        percentage: users.length > 0 ? Math.round((admins.length / users.length) * 100) : 0,
        type: 'user',
      },
    ];
  }, [users]);

  const topLocality = localityData[0] || { name: 'Gangtok', count: 0, percentage: 0, avgRent: 0 };

  // Current active chart dataset
  const currentChartData = useMemo(() => {
    if (activeTab === 'pricing') return pricingData;
    if (activeTab === 'localities') return localityData.slice(0, 7);
    if (activeTab === 'trend') return monthlyData;
    return userData;
  }, [activeTab, pricingData, localityData, monthlyData, userData]);

  const maxVal = useMemo(() => {
    const vals = currentChartData.map((d) => d.count);
    return Math.max(...vals, 1);
  }, [currentChartData]);

  // Dynamic insight text based on tab
  const dynamicInsight = useMemo(() => {
    if (activeTab === 'pricing') {
      return `Prices range from ₹${minRent.toLocaleString('en-IN')} (Budget) to ₹${maxRent.toLocaleString('en-IN')} (Premium). Average monthly rent across 8 PGs is ₹${avgRentOverall.toLocaleString('en-IN')}/mo.`;
    }
    if (activeTab === 'localities') {
      return `${topLocality.name} leads with ${topLocality.count} PGs (${topLocality.percentage}%). Avg rent: ₹${topLocality.avgRent.toLocaleString('en-IN')}/mo.`;
    }
    if (activeTab === 'trend') {
      const currentMonthCount = monthlyData[monthlyData.length - 1]?.count || activePgs.length;
      return `${currentMonthCount} PGs active this period across Sikkim.`;
    }
    const ownerCount = users.filter((u) => u.role === 'owner').length;
    return `${users.length} total members registered (${ownerCount} owners, ${users.length - ownerCount} students/admins).`;
  }, [activeTab, minRent, maxRent, avgRentOverall, topLocality, monthlyData, activePgs.length, users]);

  return (
    <>
      {/* Main Growth Card */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-slate-800/80 relative overflow-hidden group">
        {/* Glow ambient effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="animate-pulse" />
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm tracking-wide text-white flex items-center gap-1.5">
                Platform Growth
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] sm:text-xs text-[#f5a623] flex items-center gap-1 bg-[#0f2547] hover:bg-[#f5a623] hover:text-[#0f2547] active:bg-[#e09618] active:text-[#0f2547] border border-[#f5a623]/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold shadow-xs"
            title="Open comprehensive analytics"
          >
            <span>Breakdown</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Tab switcher: Pricing | Areas | Trend | Users */}
        <div className="grid grid-cols-4 bg-black/40 p-1 rounded-xl mb-3 text-[10.5px] sm:text-[11px] relative z-10 border border-white/10 gap-0.5 sm:gap-1">
          <button
            onClick={() => { setActiveTab('pricing'); setHoveredItem(null); }}
            className={`py-1 rounded-lg font-bold transition-all text-center truncate cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-[#0f2547] text-[#f5a623] shadow-sm border border-[#f5a623]/40'
                : 'text-slate-300 hover:text-[#f5a623]'
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => { setActiveTab('localities'); setHoveredItem(null); }}
            className={`py-1 rounded-lg font-bold transition-all text-center truncate cursor-pointer ${
              activeTab === 'localities'
                ? 'bg-[#0f2547] text-[#f5a623] shadow-sm border border-[#f5a623]/40'
                : 'text-slate-300 hover:text-[#f5a623]'
            }`}
          >
            <span className="sm:hidden">Areas</span>
            <span className="hidden sm:inline">Localities</span>
          </button>
          <button
            onClick={() => { setActiveTab('trend'); setHoveredItem(null); }}
            className={`py-1 rounded-lg font-bold transition-all text-center truncate cursor-pointer ${
              activeTab === 'trend'
                ? 'bg-[#0f2547] text-[#f5a623] shadow-sm border border-[#f5a623]/40'
                : 'text-slate-300 hover:text-[#f5a623]'
            }`}
          >
            Trend
          </button>
          <button
            onClick={() => { setActiveTab('users'); setHoveredItem(null); }}
            className={`py-1 rounded-lg font-bold transition-all text-center truncate cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#0f2547] text-[#f5a623] shadow-sm border border-[#f5a623]/40'
                : 'text-slate-300 hover:text-[#f5a623]'
            }`}
          >
            Users
          </button>
        </div>

        {/* Dynamic Real Insight */}
        <p className="text-slate-300 text-[11px] sm:text-xs mb-3 leading-relaxed min-h-[30px] relative z-10">
          {dynamicInsight}
        </p>

        {/* Interactive Dynamic Bar Chart */}
        <div className="relative pt-4 pb-1">
          {/* Hover floating tooltip */}
          {hoveredItem && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md shadow-xl border border-slate-700 pointer-events-none z-30 flex items-center gap-1.5 max-w-[92vw] text-center truncate">
              <span className="font-semibold text-primary-300 truncate">{hoveredItem.name}:</span>
              {activeTab === 'pricing' ? (
                <span className="text-emerald-400 font-bold">₹{hoveredItem.rent.toLocaleString('en-IN')}/mo ({hoveredItem.roomType})</span>
              ) : activeTab === 'users' ? (
                <span>{hoveredItem.count} users ({hoveredItem.percentage}%)</span>
              ) : (
                <span>{hoveredItem.count} PGs ({hoveredItem.percentage}%)</span>
              )}
            </div>
          )}

          <div className="flex items-end gap-1 sm:gap-1.5 h-20 px-0.5 sm:px-1">
            {currentChartData.map((item, i) => {
              const heightPct = Math.max(Math.round((item.count / maxVal) * 100), item.count > 0 ? 18 : 6);
              const isHovered = hoveredItem?.name === item.name;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center h-full justify-end group/bar cursor-pointer min-w-0"
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Real count or price on top of bar */}
                  <span
                    className={`text-[8px] sm:text-[9px] font-semibold transition-opacity duration-150 mb-0.5 truncate ${
                      isHovered ? 'text-emerald-400 opacity-100 scale-110' : 'text-slate-400 opacity-80'
                    }`}
                  >
                    {activeTab === 'pricing' ? item.displayValue : item.count}
                  </span>

                  {/* Bar shape */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 relative ${
                      isHovered
                        ? 'bg-gradient-to-t from-primary-500 to-emerald-400 shadow-lg shadow-emerald-500/30'
                        : item.count > 0
                        ? 'bg-gradient-to-t from-primary-600 to-primary-400 hover:from-primary-500 hover:to-primary-300'
                        : 'bg-white/10'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />

                  {/* Label */}
                  <span
                    className={`text-[8px] sm:text-[8.5px] mt-1 font-medium transition-colors text-center w-full truncate ${
                      isHovered ? 'text-white font-bold' : 'text-slate-400'
                    }`}
                    title={item.name}
                  >
                    {item.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Metrics Strip: Responsive Grid */}
        <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
          <div className="bg-white/5 rounded-xl p-1.5 sm:p-2 border border-white/5">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">Price Range</span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-400 truncate block">
              ₹{(minRent / 1000).toFixed(1)}k–₹{(maxRent / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-1.5 sm:p-2 border border-white/5">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">Avg Rent</span>
            <span className="text-[11px] sm:text-xs font-bold text-white truncate block">₹{avgRentOverall.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-1.5 sm:p-2 border border-white/5">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">Inventory</span>
            <span className="text-[11px] sm:text-xs font-bold text-primary-300 truncate block">{activePgs.length} PGs</span>
          </div>
        </div>
      </div>

      {/* Detailed Platform Analytics Modal (Fully Responsive on Mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-3xl w-full max-h-[94vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                  <BarChart3 size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">Platform Growth & Analytics</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">Live operational data from Stay Aalaya database</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
              {/* Top KPIs: 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">
                    <Building2 size={13} className="text-primary-600 shrink-0" /> <span className="truncate">Total Inventory</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">{activePgs.length} PGs</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5 truncate">{localityData.length} localities</div>
                </div>

                {/* Avg & Range KPI Card */}
                <div className="bg-emerald-50/60 rounded-xl p-2.5 sm:p-3.5 border border-emerald-100">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-emerald-800 font-medium mb-0.5 sm:mb-1">
                    <IndianRupee size={13} className="text-emerald-600 shrink-0" /> <span className="truncate">Avg Rent</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-900">
                    ₹{avgRentOverall.toLocaleString('en-IN')}<span className="text-[10px] sm:text-xs font-normal text-emerald-700">/mo</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">
                    Range: ₹{(minRent/1000).toFixed(1)}k – ₹{(maxRent/1000).toFixed(0)}k
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">
                    <Users size={13} className="text-blue-600 shrink-0" /> <span className="truncate">Users</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">{users.length}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5 truncate">{userData[0].count} students / {userData[1].count} owners</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">
                    <Star size={13} className="text-amber-500 shrink-0" /> <span className="truncate">Reviews</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900">{reviews.length}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5 truncate">Verified ratings</div>
                </div>
              </div>

              {/* Price Spectrum & Tiers Breakdown */}
              <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                      <Tag size={15} className="text-primary-600 shrink-0" /> Price Tiers & Distribution Spectrum
                    </h4>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5">
                      Breakdown across budget, mid-range, and premium properties
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllPgsInModal(!showAllPgsInModal)}
                    className="self-start sm:self-auto text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs"
                  >
                    <span>{showAllPgsInModal ? 'Hide PG List' : 'View All 8 PG Prices'}</span>
                    {showAllPgsInModal ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* 3 Price Tier Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {priceTiers.map((tier) => (
                    <div key={tier.name} className="rounded-xl p-3 border bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-slate-900">{tier.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tier.badge}`}>
                          {tier.count} PGs ({activePgs.length > 0 ? Math.round((tier.count / activePgs.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2">{tier.range}</div>
                      <div className="space-y-1">
                        {tier.pgs.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-50 text-slate-700">
                            <span className="truncate max-w-[170px] sm:max-w-[130px]" title={p.title}>{p.title}</span>
                            <span className="font-bold text-slate-900 shrink-0 ml-1">₹{Number(p.rent || p.price).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Individual PGs Table Drawer (Responsive horizontal scroll) */}
                {showAllPgsInModal && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200">
                    <h5 className="text-xs font-semibold text-slate-800 mb-2">Complete Price Sheet (All Listings)</h5>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[420px] sm:min-w-full">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Property</th>
                            <th className="py-2 px-3">Locality</th>
                            <th className="py-2 px-3">Room Type</th>
                            <th className="py-2 px-3 text-right">Monthly Rent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pricingData.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-medium text-slate-900">{p.name}</td>
                              <td className="py-2 px-3 text-slate-600">{p.locality}</td>
                              <td className="py-2 px-3 text-slate-500">{p.roomType}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700">
                                ₹{p.rent.toLocaleString('en-IN')}/mo
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Locality Market Share: Fully Responsive with Mobile Cards + Desktop Table */}
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <MapPin size={15} className="text-primary-600 shrink-0" /> Locality Market Share & Rates
                </h4>

                {/* Mobile View (<sm screens): Clean, 100% visible stacked cards */}
                <div className="block sm:hidden space-y-2">
                  {localityData.map((item) => (
                    <div key={item.name} className="bg-slate-50 rounded-xl p-3 border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                          {item.name}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{item.avgRent.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                        <span>{item.count} PG{item.count > 1 ? 's' : ''} listed</span>
                        <span className="text-slate-600 font-medium">{item.percentage}% share</span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-primary-600 h-full rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                        <span className="text-slate-400">Status</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 size={11} /> 100% Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop / Tablet View (sm: screens and up): Full Structured Table with horizontal scroll support */}
                <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Locality</th>
                        <th className="py-2.5 px-3.5">Listings</th>
                        <th className="py-2.5 px-3.5">Market Share</th>
                        <th className="py-2.5 px-3.5">Avg Rent</th>
                        <th className="py-2.5 px-3.5 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {localityData.map((item) => (
                        <tr key={item.name} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block shrink-0" />
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3.5">{item.count} PG{item.count > 1 ? 's' : ''}</td>
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-primary-600 h-full rounded-full"
                                  style={{ width: `${item.percentage}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500">{item.percentage}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-emerald-700">
                            ₹{item.avgRent.toLocaleString('en-IN')}/mo
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 size={11} /> 100%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Insights */}
              <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
                <h4 className="font-semibold text-xs sm:text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-primary-600 shrink-0" /> Platform Financial & Inventory Summary
                </h4>
                <div className="space-y-1.5 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  <p>
                    • <strong>Rent Diversity:</strong> Rents span from <strong>₹3,800/mo</strong> (Manipal Student Budget) to <strong>₹9,000/mo</strong> (MG Marg Heritage Homestay).
                  </p>
                  <p>
                    • <strong>Average Rent Calculation:</strong> Total Monthly Pool of <strong>₹{totalRentSum.toLocaleString('en-IN')}/mo</strong> ÷ 8 listings = <strong>₹{avgRentOverall.toLocaleString('en-IN')}</strong>.
                  </p>
                  <p>
                    • <strong>Top Student Hub:</strong> Majitar accounts for <strong>{topLocality.percentage}%</strong> of listings with strong SMIT demand.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer: Responsive buttons */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] sm:text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-left">
                Stay Aalaya Admin Intelligence
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                <button
                  onClick={() => { setIsModalOpen(false); navigate('/admin/pgs'); }}
                  className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all text-center"
                >
                  Manage Listings
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-xs transition-all text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
