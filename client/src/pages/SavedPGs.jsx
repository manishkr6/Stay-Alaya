import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import PGCard from '../components/ui/PGCard';
import { EmptyState } from '../components/ui/index.jsx';

export default function SavedPGs() {
  const { currentUser } = useAuth();
  const { getSavedPGs } = useData();
  const navigate = useNavigate();

  const savedPGs = getSavedPGs(currentUser?.id) || [];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 lg:pt-28 pb-12">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Saved PGs</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">All your bookmarked properties in one place</p>
        </div>

        {savedPGs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <EmptyState
              title="No saved PGs"
              message="Start exploring and save properties you like."
              icon={Heart}
              actionLabel="Find PGs"
              onAction={() => navigate('/find-pg')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedPGs.map((pg) => (
              <PGCard key={pg.id} pg={pg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
