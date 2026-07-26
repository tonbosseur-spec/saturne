import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { COUNTRY_CODES, CountryCode, getFlagUrl } from '../data/countryCodes';

interface CountryCodeSelectProps {
  value: string; // Dial code e.g. "+237"
  onChange: (code: string) => void;
  hasError?: boolean;
  mainColor?: string;
  className?: string;
}

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value,
  onChange,
  hasError = false,
  mainColor = '#3B82F6',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected country
  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === value) ||
    COUNTRY_CODES.find((c) => c.code === '+33') ||
    COUNTRY_CODES[0];

  // Filter countries by search query
  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      c.country.toLowerCase().includes(query) ||
      c.code.includes(query) ||
      c.iso.toLowerCase().includes(query)
    );
  });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (country: CountryCode) => {
    onChange(country.code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 bg-white/70 backdrop-blur-md border-2 rounded-2xl px-3.5 py-3.5 text-slate-800 transition-all shadow-xs hover:bg-white/90 focus:outline-none ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-slate-200 hover:border-slate-300'
        }`}
        style={isOpen ? { borderColor: mainColor, boxShadow: `0 0 0 3px ${mainColor}20` } : undefined}
      >
        <img
          src={getFlagUrl(selectedCountry.iso)}
          alt={selectedCountry.country}
          className="w-6 h-4 object-cover rounded-xs border border-slate-200/80 shadow-2xs shrink-0"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className="font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap">
          {selectedCountry.code}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-80 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher un pays (+237, Cameroun...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="overflow-y-auto max-h-60 p-1.5 space-y-0.5 custom-scrollbar">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                Aucun pays trouvé
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code && c.iso === selectedCountry.iso;
                return (
                  <button
                    key={`${c.iso}-${c.code}`}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'hover:bg-slate-100/80 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img
                        src={getFlagUrl(c.iso)}
                        alt={c.country}
                        className="w-5 h-3.5 object-cover rounded-2xs border border-slate-200/80 shadow-2xs shrink-0"
                        loading="lazy"
                      />
                      <span className="truncate">{c.country}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <span className="font-mono text-slate-500 text-xs">{c.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
