export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}

export const COUNTRIES: CountryCode[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', minLength: 10, maxLength: 10, placeholder: '98765 43210' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', minLength: 10, maxLength: 10, placeholder: '202 555 0143' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', minLength: 10, maxLength: 11, placeholder: '7911 123456' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', minLength: 10, maxLength: 10, placeholder: '416 555 0192' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', minLength: 9, maxLength: 10, placeholder: '412 345 678' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', minLength: 8, maxLength: 8, placeholder: '8123 4567' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', minLength: 10, maxLength: 11, placeholder: '151 23456789' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', minLength: 9, maxLength: 9, placeholder: '6 12 34 56 78' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', minLength: 10, maxLength: 11, placeholder: '90 1234 5678' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', minLength: 11, maxLength: 11, placeholder: '138 0013 8000' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', minLength: 9, maxLength: 10, placeholder: '12 345 6789' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', minLength: 9, maxLength: 12, placeholder: '812 3456 7890' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', minLength: 9, maxLength: 9, placeholder: '81 234 5678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', minLength: 10, maxLength: 10, placeholder: '917 123 4567' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', minLength: 9, maxLength: 10, placeholder: '90 123 4567' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', minLength: 10, maxLength: 10, placeholder: '1712 345678' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', minLength: 9, maxLength: 9, placeholder: '71 234 5678' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', minLength: 10, maxLength: 10, placeholder: '984 1234567' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', minLength: 10, maxLength: 10, placeholder: '300 1234567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', minLength: 8, maxLength: 8, placeholder: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', minLength: 8, maxLength: 8, placeholder: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', minLength: 8, maxLength: 8, placeholder: '3912 3456' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', minLength: 9, maxLength: 9, placeholder: '71 234 5678' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', minLength: 10, maxLength: 10, placeholder: '10 1234 5678' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', minLength: 9, maxLength: 9, placeholder: '712 345678' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', minLength: 10, maxLength: 10, placeholder: '802 123 4567' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', minLength: 8, maxLength: 10, placeholder: '21 123 4567' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', minLength: 9, maxLength: 10, placeholder: '312 345 6789' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', minLength: 9, maxLength: 9, placeholder: '612 34 56 78' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', minLength: 9, maxLength: 9, placeholder: '6 12345678' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', minLength: 9, maxLength: 9, placeholder: '78 123 45 67' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', minLength: 9, maxLength: 10, placeholder: '70 123 45 67' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', minLength: 8, maxLength: 8, placeholder: '412 34 567' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', minLength: 8, maxLength: 8, placeholder: '20 12 34 56' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', minLength: 9, maxLength: 10, placeholder: '40 1234567' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', minLength: 9, maxLength: 9, placeholder: '85 123 4567' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', minLength: 9, maxLength: 9, placeholder: '470 12 34 56' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', minLength: 10, maxLength: 11, placeholder: '664 1234567' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', minLength: 9, maxLength: 9, placeholder: '512 345 678' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', minLength: 9, maxLength: 9, placeholder: '912 345 678' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', minLength: 10, maxLength: 10, placeholder: '691 234 5678' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', minLength: 10, maxLength: 10, placeholder: '532 123 4567' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', minLength: 9, maxLength: 9, placeholder: '50 123 4567' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', minLength: 9, maxLength: 10, placeholder: '10 1234 5678' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', minLength: 10, maxLength: 11, placeholder: '11 91234 5678' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', minLength: 10, maxLength: 10, placeholder: '55 1234 5678' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', minLength: 10, maxLength: 10, placeholder: '9 11 1234 5678' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', minLength: 9, maxLength: 9, placeholder: '9 1234 5678' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', minLength: 10, maxLength: 10, placeholder: '300 123 4567' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', minLength: 10, maxLength: 10, placeholder: '912 345 67 89' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', minLength: 9, maxLength: 9, placeholder: '912 345 678' },
];

export const DEFAULT_COUNTRY: CountryCode = COUNTRIES[0]; // India (+91)

export function parseMobileAndCountry(fullMobile?: string): { country: CountryCode; digits: string } {
  if (!fullMobile || !fullMobile.trim()) {
    return { country: DEFAULT_COUNTRY, digits: '' };
  }
  const clean = fullMobile.trim();
  for (const c of COUNTRIES) {
    if (clean.startsWith(c.dialCode)) {
      const remaining = clean.slice(c.dialCode.length).replace(/\D/g, '');
      return { country: c, digits: remaining };
    }
  }
  const fallbackDigits = clean.replace(/\D/g, '');
  return { country: DEFAULT_COUNTRY, digits: fallbackDigits.slice(0, 10) };
}
