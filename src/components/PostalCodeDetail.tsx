import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Building2, Map } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PostalCode } from '../lib/database.types';

interface PostalCodeDetailProps {
  postalCode: string;
  onBack: () => void;
}

export default function PostalCodeDetail({ postalCode, onBack }: PostalCodeDetailProps) {
  const [data, setData] = useState<PostalCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPostalCodeData = async () => {
      setIsLoading(true);

      const { data: results, error } = await supabase
        .from('postal_codes')
        .select('*')
        .eq('postal_code', postalCode);

      if (error) {
        console.error('Error fetching postal code:', error);
      } else {
        setData(results || []);
      }

      setIsLoading(false);
    };

    fetchPostalCodeData();
  }, [postalCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-slate-400 border-r-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to search
          </button>
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">
              Postal code not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  const firstEntry = data[0];

  const toSlug = (s: string) =>
    (s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'area';

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6 sm:mb-8 transition-colors min-h-[2.75rem] touch-manipulation -ml-1"
        >
          <ArrowLeft size={20} className="mr-2 shrink-0" />
          Back to search
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 px-4 sm:px-8 py-8 sm:py-12 text-white">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-2">{postalCode}</h1>
            <p className="text-blue-100 text-base sm:text-lg">South African Postal Code</p>
          </div>

          <div className="p-4 sm:p-8">
            <div className="grid gap-6">
              {data.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`pb-6 ${index < data.length - 1 ? 'border-b border-slate-200' : ''}`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="flex items-start">
                      <MapPin className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">Area</div>
                        <div className="text-lg font-semibold text-slate-800">{entry.area}</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Building2 className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">City</div>
                        <div className="text-lg font-semibold text-slate-800">
                          {entry.city ? (
                            <a
                              href={`/town/${toSlug(entry.city)}/`}
                              className="text-blue-600 hover:underline"
                            >
                              {entry.city}
                            </a>
                          ) : (
                            entry.city
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Map className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <div className="text-sm font-medium text-slate-500 mb-1">Province</div>
                        <div className="text-lg font-semibold text-slate-800">
                          {entry.province ? (
                            <a
                              href={`/province/${toSlug(entry.province)}/`}
                              className="text-blue-600 hover:underline"
                            >
                              {entry.province}
                            </a>
                          ) : (
                            entry.province
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">About This Postal Code</h2>
              <p className="text-slate-600 leading-relaxed">
                The postal code <strong>{postalCode}</strong> serves{' '}
                {data.length === 1 ? (
                  <>
                    the area of <strong>{firstEntry.area}</strong> in{' '}
                    {firstEntry.city ? (
                      <a href={`/town/${toSlug(firstEntry.city)}/`} className="text-blue-600 hover:underline font-semibold">
                        {firstEntry.city}
                      </a>
                    ) : (
                      <strong>{firstEntry.city}</strong>
                    )}
                    ,{' '}
                    {firstEntry.province ? (
                      <a href={`/province/${toSlug(firstEntry.province)}/`} className="text-blue-600 hover:underline font-semibold">
                        {firstEntry.province}
                      </a>
                    ) : (
                      <strong>{firstEntry.province}</strong>
                    )}
                  </>
                ) : (
                  <>multiple areas including {data.map(d => d.area).join(', ')}</>
                )}
                . This is an official South African postal code used for mail delivery and location identification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
