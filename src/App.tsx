import { useState, useEffect, lazy, Suspense } from 'react';
import SearchPage from './components/SearchPage';
const PostalCodeDetail = lazy(() => import('./components/PostalCodeDetail'));
import { isSupabaseConfigured } from './lib/supabase';

function App() {
  const [currentView, setCurrentView] = useState<'search' | 'detail'>('search');
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('code/')) {
      const code = hash.replace('code/', '');
      setSelectedPostalCode(code);
      setCurrentView('detail');
    } else {
      setCurrentView('search');
      setSelectedPostalCode(null);
    }
  }, []);

  const handlePostalCodeSelect = (postalCode: string) => {
    window.location.hash = `code/${postalCode}`;
    setSelectedPostalCode(postalCode);
    setCurrentView('detail');
  };

  const handleBackToSearch = () => {
    window.location.hash = '';
    setCurrentView('search');
    setSelectedPostalCode(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="bg-circles" aria-hidden="true">
        <div className="bg-circle bg-circle--solid bg-circle-1" />
        <div className="bg-circle bg-circle--dashed bg-circle-2" />
        <div className="bg-circle bg-circle--gradient bg-circle-3" />
        <div className="bg-circle bg-circle--solid bg-circle-4" />
        <div className="bg-circle bg-circle--gradient-dashed bg-circle-5" />
        <div className="bg-circle bg-circle--solid bg-circle-6" />
        <div className="bg-circle bg-circle--gradient bg-circle-7" />
        <div className="bg-circle bg-circle--dashed bg-circle-8" />
        <div className="bg-circle bg-circle--gradient bg-circle-9" />
        <div className="bg-circle bg-circle--gradient-dashed bg-circle-10" />
        <div className="bg-circle bg-circle--solid bg-circle-11" />
        <div className="bg-circle bg-circle--gradient bg-circle-12" />
        <div className="bg-circle bg-circle--solid bg-circle-13" />
        <div className="bg-circle bg-circle--green-gradient bg-circle-14" />
        <div className="bg-circle bg-circle--dotted bg-circle-15" />
        <div className="bg-circle bg-circle--solid bg-circle-16" />
        <div className="bg-circle bg-circle--gradient bg-circle-17" />
        <div className="bg-circle bg-circle--dotted bg-circle-18" />
        <div className="bg-circle bg-circle--gradient bg-circle-19" />
        <div className="bg-circle bg-circle--dashed bg-circle-20" />
        <div className="bg-circle bg-circle--solid bg-circle-21" />
        <div className="bg-circle bg-circle--green-gradient bg-circle-22" />
        <div className="bg-circle bg-circle--dotted bg-circle-23" />
        <div className="bg-circle bg-circle--gradient-dashed bg-circle-24" />
      </div>
      <header className="header-moving-gradient h-16 shadow-md relative z-10" />
      <div className="relative z-10">
      {!isSupabaseConfigured && (
        <div
          className="bg-amber-500 text-amber-950 px-4 py-3 text-center text-sm font-medium"
          role="alert"
        >
          Supabase is not configured. Create a <code className="rounded bg-amber-600/40 px-1">.env</code> file with{' '}
          <code className="rounded bg-amber-600/40 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-amber-600/40 px-1">VITE_SUPABASE_ANON_KEY</code> (see{' '}
          <code className="rounded bg-amber-600/40 px-1">.env</code> with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), then restart.
        </div>
      )}
      {currentView === 'search' ? (
        <SearchPage onPostalCodeSelect={handlePostalCodeSelect} />
      ) : (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-400 border-r-transparent" /></div>}>
          <PostalCodeDetail
            postalCode={selectedPostalCode!}
            onBack={handleBackToSearch}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}

export default App;
