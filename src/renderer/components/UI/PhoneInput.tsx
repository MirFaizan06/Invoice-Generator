import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PhoneInput.css';

interface Country {
  code: string;   // ISO 3166-1 alpha-2
  dial: string;   // e.g. "+91"
  name: string;
  flag: string;   // emoji
}

const COUNTRIES: Country[] = [
  { code: 'IN', dial: '+91',  name: 'India',                flag: '🇮🇳' },
  { code: 'PK', dial: '+92',  name: 'Pakistan',             flag: '🇵🇰' },
  { code: 'BD', dial: '+880', name: 'Bangladesh',           flag: '🇧🇩' },
  { code: 'LK', dial: '+94',  name: 'Sri Lanka',            flag: '🇱🇰' },
  { code: 'NP', dial: '+977', name: 'Nepal',                flag: '🇳🇵' },
  { code: 'AE', dial: '+971', name: 'UAE',                  flag: '🇦🇪' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia',         flag: '🇸🇦' },
  { code: 'QA', dial: '+974', name: 'Qatar',                flag: '🇶🇦' },
  { code: 'KW', dial: '+965', name: 'Kuwait',               flag: '🇰🇼' },
  { code: 'BH', dial: '+973', name: 'Bahrain',              flag: '🇧🇭' },
  { code: 'OM', dial: '+968', name: 'Oman',                 flag: '🇴🇲' },
  { code: 'US', dial: '+1',   name: 'United States',        flag: '🇺🇸' },
  { code: 'CA', dial: '+1',   name: 'Canada',               flag: '🇨🇦' },
  { code: 'GB', dial: '+44',  name: 'United Kingdom',       flag: '🇬🇧' },
  { code: 'AU', dial: '+61',  name: 'Australia',            flag: '🇦🇺' },
  { code: 'NZ', dial: '+64',  name: 'New Zealand',          flag: '🇳🇿' },
  { code: 'SG', dial: '+65',  name: 'Singapore',            flag: '🇸🇬' },
  { code: 'MY', dial: '+60',  name: 'Malaysia',             flag: '🇲🇾' },
  { code: 'ID', dial: '+62',  name: 'Indonesia',            flag: '🇮🇩' },
  { code: 'PH', dial: '+63',  name: 'Philippines',          flag: '🇵🇭' },
  { code: 'TH', dial: '+66',  name: 'Thailand',             flag: '🇹🇭' },
  { code: 'CN', dial: '+86',  name: 'China',                flag: '🇨🇳' },
  { code: 'JP', dial: '+81',  name: 'Japan',                flag: '🇯🇵' },
  { code: 'KR', dial: '+82',  name: 'South Korea',          flag: '🇰🇷' },
  { code: 'DE', dial: '+49',  name: 'Germany',              flag: '🇩🇪' },
  { code: 'FR', dial: '+33',  name: 'France',               flag: '🇫🇷' },
  { code: 'IT', dial: '+39',  name: 'Italy',                flag: '🇮🇹' },
  { code: 'ES', dial: '+34',  name: 'Spain',                flag: '🇪🇸' },
  { code: 'NL', dial: '+31',  name: 'Netherlands',          flag: '🇳🇱' },
  { code: 'SE', dial: '+46',  name: 'Sweden',               flag: '🇸🇪' },
  { code: 'NO', dial: '+47',  name: 'Norway',               flag: '🇳🇴' },
  { code: 'DK', dial: '+45',  name: 'Denmark',              flag: '🇩🇰' },
  { code: 'CH', dial: '+41',  name: 'Switzerland',          flag: '🇨🇭' },
  { code: 'ZA', dial: '+27',  name: 'South Africa',         flag: '🇿🇦' },
  { code: 'NG', dial: '+234', name: 'Nigeria',              flag: '🇳🇬' },
  { code: 'KE', dial: '+254', name: 'Kenya',                flag: '🇰🇪' },
  { code: 'EG', dial: '+20',  name: 'Egypt',                flag: '🇪🇬' },
  { code: 'GH', dial: '+233', name: 'Ghana',                flag: '🇬🇭' },
  { code: 'BR', dial: '+55',  name: 'Brazil',               flag: '🇧🇷' },
  { code: 'MX', dial: '+52',  name: 'Mexico',               flag: '🇲🇽' },
  { code: 'AR', dial: '+54',  name: 'Argentina',            flag: '🇦🇷' },
  { code: 'RU', dial: '+7',   name: 'Russia',               flag: '🇷🇺' },
  { code: 'TR', dial: '+90',  name: 'Turkey',               flag: '🇹🇷' },
  { code: 'IR', dial: '+98',  name: 'Iran',                 flag: '🇮🇷' },
  { code: 'IQ', dial: '+964', name: 'Iraq',                 flag: '🇮🇶' },
  { code: 'JO', dial: '+962', name: 'Jordan',               flag: '🇯🇴' },
  { code: 'LB', dial: '+961', name: 'Lebanon',              flag: '🇱🇧' },
  { code: 'ET', dial: '+251', name: 'Ethiopia',             flag: '🇪🇹' },
  { code: 'TZ', dial: '+255', name: 'Tanzania',             flag: '🇹🇿' },
  { code: 'UG', dial: '+256', name: 'Uganda',               flag: '🇺🇬' },
];

export function parsePhoneValue(value: string): { dialCode: string; number: string } {
  if (!value) return { dialCode: '+91', number: '' };
  const matched = COUNTRIES.find((c) => value.startsWith(c.dial + ' ') || value.startsWith(c.dial));
  if (matched) {
    const num = value.startsWith(matched.dial + ' ')
      ? value.slice(matched.dial.length + 1)
      : value.slice(matched.dial.length);
    return { dialCode: matched.dial, number: num };
  }
  return { dialCode: '+91', number: value };
}

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label, value, onChange, placeholder = '98765 43210', error, hint, required,
}) => {
  const parsed = parsePhoneValue(value);
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [number, setNumber] = useState(parsed.number);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync inbound value changes (e.g. form reset or autofill)
  useEffect(() => {
    const p = parsePhoneValue(value);
    setDialCode(p.dialCode);
    setNumber(p.number);
  }, [value]);

  const emit = useCallback((dc: string, num: string) => {
    onChange(num ? `${dc} ${num}` : '');
  }, [onChange]);

  const handleDialChange = (dc: string) => {
    setDialCode(dc);
    setOpen(false);
    setSearch('');
    emit(dc, number);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setNumber(num);
    emit(dialCode, num);
  };

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30);
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const selectedCountry = COUNTRIES.find((c) => c.dial === dialCode) || COUNTRIES[0];

  return (
    <div className="phone-input-wrapper" ref={wrapRef}>
      {label && (
        <label className="input-label">
          {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div className={`phone-input-field${error ? ' has-error' : ''}`}>
        <button
          type="button"
          className="phone-dial-btn"
          onClick={() => setOpen((o) => !o)}
          tabIndex={0}
        >
          <span className="phone-flag">{selectedCountry.flag}</span>
          <span className="phone-dial-code">{dialCode}</span>
          <svg className="phone-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="phone-divider" />
        <input
          type="tel"
          className="phone-number-input"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder}
        />
      </div>
      {error && <span className="input-error">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}

      {open && (
        <div className="phone-dropdown">
          <div className="phone-dropdown-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              className="phone-search-input"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="phone-dropdown-list">
            {filtered.length === 0 ? (
              <div className="phone-dropdown-empty">No results</div>
            ) : filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`phone-dropdown-item${c.dial === dialCode && c.code === selectedCountry.code ? ' active' : ''}`}
                onClick={() => handleDialChange(c.dial)}
              >
                <span className="phone-flag">{c.flag}</span>
                <span className="phone-country-name">{c.name}</span>
                <span className="phone-country-dial">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
