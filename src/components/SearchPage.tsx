import { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PostalCode } from '../lib/database.types';

interface SearchPageProps {
  onPostalCodeSelect: (postalCode: string) => void;
}

export default function SearchPage({ onPostalCodeSelect }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PostalCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const searchByTerm = async (term: string): Promise<PostalCode[]> => {
    const { data } = await supabase
      .from('postal_codes')
      .select('*')
      .or(`postal_code.ilike.%${term}%,area.ilike.%${term}%,city.ilike.%${term}%,province.ilike.%${term}%,aliases.ilike.%${term}%`)
      .order('postal_code')
      .limit(20);
    return data || [];
  };

  const findBestLocationMatch = async (addr: Record<string, string>): Promise<PostalCode | null> => {
    const postcode = String(addr.postcode || '').trim();
    const suburb = String(addr.suburb || addr.neighbourhood || addr.quarter || '').trim();
    const village = String(addr.village || addr.town || '').trim();
    let city = String(addr.city || addr.municipality || addr.county || '').trim();
    const state = String(addr.state || '').trim();
    if (city && city.includes(' of ')) {
      city = city.replace(/^(City|District|Metropolitan Municipality) of /i, '').trim();
    }
    const terms = [postcode, suburb, village, city, state].filter(Boolean);
    const combined = [
      suburb && city ? `${suburb} ${city}` : '',
      suburb && village ? suburb + village : '',
      village && city ? `${village} ${city}` : '',
    ].filter(Boolean);
    const allTerms = [...terms, ...combined];
    const seen = new Set<string>();
    let best: PostalCode | null = null;
    let bestScore = 0;
    for (const term of allTerms) {
      const q = term.toLowerCase();
      if (!q || q.length < 2 || seen.has(q)) continue;
      seen.add(q);
      const matches = await searchByTerm(term);
      for (const r of matches) {
        let score = 0;
        if (postcode && r.postal_code === postcode) score = 100;
        else if (
          (r.area || '').toLowerCase().includes(q) ||
          (r.aliases || '').toLowerCase().includes(q)
        )
          score = 85;
        else if ((r.city || '').toLowerCase().includes(q)) score = 70;
        else if ((r.province || '').toLowerCase().includes(q)) score = 50;
        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      }
      if (bestScore >= 100) break;
    }
    return best;
  };

  const handleUseLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const [nomRes, photonRes] = await Promise.all([
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              {
                headers: {
                  Accept: 'application/json',
                  'Accept-Language': 'en',
                  'User-Agent': 'MyZipCode-co-za/1.0',
                },
              }
            ).then((r) => r.json()),
            fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`)
              .then((r) => r.json())
              .catch(() => null),
          ]);
          const data = nomRes;
          let addr: Record<string, string> = data?.address || {};
          if (data?.country_code && data.country_code !== 'za') {
            setLocationError('Location is not in South Africa.');
            return;
          }
          if (photonRes?.features?.[0]) {
            const p = photonRes.features[0].properties || {};
            if (p.countrycode !== 'ZA') {
              setLocationError('Location is not in South Africa.');
              return;
            }
            if (p.postcode) addr.postcode = p.postcode;
            if (p.locality) addr.suburb = p.locality;
            if (!addr.city && p.city) addr.city = p.city;
            if (!addr.state && p.state) addr.state = p.state;
            if (!addr.municipality && p.county) addr.municipality = p.county;
          }
          const best = await findBestLocationMatch(addr);
          if (best) {
            onPostalCodeSelect(best.postal_code);
            return;
          }
          const fallback =
            addr.postcode ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.state ||
            '';
          if (fallback) {
            setSearchQuery(String(fallback).trim());
          } else {
            setLocationError('Could not get address for this location.');
          }
        } catch {
          setLocationError('Failed to look up address.');
        } finally {
          setIsLocationLoading(false);
        }
      },
      (err) => {
        setIsLocationLoading(false);
        if (err.code === 1) {
          setLocationError('Location access was denied.');
        } else if (err.code === 2) {
          setLocationError('Location unavailable.');
        } else {
          setLocationError('Could not get your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    const searchPostalCodes = async () => {
      if (searchQuery.trim() === '') {
        setResults([]);
        return;
      }

      setIsLoading(true);

      const { data, error } = await supabase
        .from('postal_codes')
        .select('*')
        .or(`postal_code.ilike.%${searchQuery}%,area.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,province.ilike.%${searchQuery}%,aliases.ilike.%${searchQuery}%`)
        .order('postal_code')
        .limit(20);

      if (error) {
        console.error('Error searching postal codes:', error);
      } else {
        setResults(data || []);
      }

      setIsLoading(false);
    };

    const debounceTimer = setTimeout(searchPostalCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-2 sm:mb-3">
            South African Postal Code Search
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            Search for South African Postal Codes
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center p-3 sm:p-4 gap-2">
            <Search className="text-slate-400 shrink-0" size={24} />
            <input
              type="text"
              placeholder="Search by postal code, area, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 outline-none text-base sm:text-lg text-slate-800 placeholder-slate-400"
            />
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={isLocationLoading}
              className="shrink-0 flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[2.75rem] touch-manipulation"
              title="Use my location"
            >
              {isLocationLoading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin size={18} />
              )}
              <span className="hidden sm:inline">Use location</span>
            </button>
          </div>
          {locationError && (
            <p className="px-4 pb-3 text-sm text-amber-600" role="alert">
              {locationError}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-400 border-r-transparent"></div>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-100">
            {results.map((result) => {
              const toSlug = (s: string) =>
                (s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'area';
              const cityPart = result.city ? (
                <a
                  href={`/town/${toSlug(result.city)}/`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:underline"
                >
                  {result.city}
                </a>
              ) : null;
              const provPart = result.province ? (
                <a
                  href={`/province/${toSlug(result.province)}/`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:underline"
                >
                  {result.province}
                </a>
              ) : null;
              return (
                <button
                  key={result.id}
                  onClick={() => onPostalCodeSelect(result.postal_code)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[3.5rem] touch-manipulation"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-0.5 sm:mb-1 truncate">
                        {result.area}
                      </h3>
                      <p className="text-sm text-slate-600 truncate">
                        {cityPart}
                        {cityPart && provPart ? ', ' : ''}
                        {provPart}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg sm:text-xl font-bold text-blue-600">
                        {result.postal_code}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && searchQuery && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">
              No postal codes found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}