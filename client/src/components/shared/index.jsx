// ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!currentUser || currentUser.isBlocked) return <Navigate to="/login" replace />;
  if (allowedRoles) {
    const userRole = currentUser.role === 'user' ? 'student' : currentUser.role;
    const isAllowed = allowedRoles.some((r) => (r === 'user' ? 'student' : r) === userRole);
    if (!isAllowed) return <Navigate to="/" replace />;
  }
  return children;
}

// SearchBar.jsx
import { useState } from 'react';
import { Search, MapPin, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SearchBar({ onSearch, compact = false }) {
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (onSearch) { onSearch({ location, maxPrice }); }
    else { navigate(`/find-pg?${params.toString()}`); }
  };

  const cities = ['Gangtok', 'Singtam', 'Namchi', 'Jorethang', 'Gyalshing', 'Mangan', 'Ravangla', 'Pakyong', 'Rangpo'];

  return (
    <div className={`flex flex-col sm:flex-row gap-2 ${compact ? '' : 'bg-white rounded-2xl p-2.5 sm:p-2 shadow-xl border border-slate-100'}`}>
      <div className={`flex items-center gap-2 ${compact ? 'border border-slate-200 rounded-xl px-3 py-2' : 'px-4 py-2.5 sm:py-2 border-b sm:border-b-0 sm:border-r border-slate-100 flex-1'}`}>
        <MapPin size={16} className="text-primary-500 shrink-0" />
        <select value={location} onChange={e => setLocation(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-700 min-w-0 border-0 outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer">
          <option value="">Where in Sikkim?</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'border border-slate-200 rounded-xl px-3 py-2' : 'px-4 py-2.5 sm:py-2 flex-1'}`}>
        <DollarSign size={16} className="text-primary-500 shrink-0" />
        <select value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-700 min-w-0 border-0 outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer">
          <option value="">Price Range</option>
          <option value="3000">Up to ₹3,000</option>
          <option value="5000">Up to ₹5,000</option>
          <option value="7000">Up to ₹7,000</option>
          <option value="10000">Up to ₹10,000</option>
        </select>
      </div>
      <button onClick={handleSearch} className="btn-primary flex items-center justify-center gap-2 shrink-0 py-3 sm:py-2.5 w-full sm:w-auto">
        <Search size={16} /> Search
      </button>
    </div>
  );
}
