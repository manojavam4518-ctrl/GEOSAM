/**
 * Standardized ISO Country & Global Transportation Hub Dataset
 * for Proforma Invoice Cross-Border Logistics
 */

export interface CountryItem {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export const ALL_COUNTRIES: CountryItem[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dialCode: '+93' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', dialCode: '+355' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dialCode: '+213' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', dialCode: '+376' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', dialCode: '+374' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', dialCode: '+994' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', dialCode: '+975' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', dialCode: '+387' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', dialCode: '+267' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', dialCode: '+673' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', dialCode: '+359' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', dialCode: '+855' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dialCode: '+237' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', dialCode: '+385' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', dialCode: '+357' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dialCode: '+420' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', dialCode: '+372' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dialCode: '+251' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dialCode: '+358' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', dialCode: '+995' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dialCode: '+30' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dialCode: '+852' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', dialCode: '+36' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', dialCode: '+354' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dialCode: '+98' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dialCode: '+964' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dialCode: '+972' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dialCode: '+7' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', dialCode: '+996' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', dialCode: '+856' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', dialCode: '+371' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', dialCode: '+370' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', dialCode: '+960' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', dialCode: '+230' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', dialCode: '+377' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', dialCode: '+976' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', dialCode: '+382' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', dialCode: '+95' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', dialCode: '+507' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dialCode: '+51' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', dialCode: '+40' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dialCode: '+7' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', dialCode: '+381' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', dialCode: '+421' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', dialCode: '+386' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dialCode: '+886' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dialCode: '+90' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dialCode: '+380' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'UZ', name: 'Uzbekistan', flag: 'UZ', dialCode: '+998' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dialCode: '+84' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', dialCode: '+967' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },
];

export interface CargoLocationItem {
  name: string;
  subtext: string;
  category: 'CITY' | 'PORT' | 'AIRPORT' | 'CFS' | 'COUNTRY';
}

export const CARGO_LOCATIONS: CargoLocationItem[] = [
  // India Ports & Transit Hubs
  { name: 'Bangalore, India', subtext: 'Major Hub • BLR Kempegowda Air Cargo', category: 'AIRPORT' },
  { name: 'Bengaluru ICD Whitefield, India', subtext: 'Inland Container Depot • Karnataka', category: 'CFS' },
  { name: 'Mumbai, India', subtext: 'Major Gateway • Air Cargo Complex (BOM)', category: 'AIRPORT' },
  { name: 'Nhava Sheva (JNPT), India', subtext: 'Jawaharlal Nehru Port • Maharashtra', category: 'PORT' },
  { name: 'Delhi (DEL), India', subtext: 'Indira Gandhi International Air Cargo', category: 'AIRPORT' },
  { name: 'ICD Tughlakabad, Delhi, India', subtext: 'Inland Container Depot', category: 'CFS' },
  { name: 'Chennai Port, India', subtext: 'Major Sea Port • Tamil Nadu', category: 'PORT' },
  { name: 'Chennai Air Cargo (MAA), India', subtext: 'International Cargo Terminal', category: 'AIRPORT' },
  { name: 'Kolkata Port / Airport (CCU), India', subtext: 'Syama Prasad Mookerjee Port', category: 'PORT' },
  { name: 'Hyderabad (HYD), India', subtext: 'RGIA Air Cargo Complex • Telangana', category: 'AIRPORT' },
  { name: 'Ahmedabad (AMD), India', subtext: 'Air Cargo Terminal • Gujarat', category: 'AIRPORT' },
  { name: 'Mundra Port, Gujarat, India', subtext: 'Private Container Port Gateway', category: 'PORT' },
  { name: 'Cochin Port (COK), Kerala, India', subtext: 'Vallarpadam ICTT Port', category: 'PORT' },
  { name: 'Tuticorin Port (VOCPT), India', subtext: 'V.O.Chidambaranar Port', category: 'PORT' },

  // International Air & Sea Gateways
  { name: 'Dubai, United Arab Emirates', subtext: 'DXB Cargo / Jebel Ali Port (JEA)', category: 'PORT' },
  { name: 'Abu Dhabi, United Arab Emirates', subtext: 'AUH Airport / Khalifa Port', category: 'AIRPORT' },
  { name: 'Sharjah, United Arab Emirates', subtext: 'Sharjah International Freight Hub', category: 'AIRPORT' },
  { name: 'London Heathrow (LHR), United Kingdom', subtext: 'Major UK Air Cargo Hub', category: 'AIRPORT' },
  { name: 'London Gateway, United Kingdom', subtext: 'Deep-Sea Container Port', category: 'PORT' },
  { name: 'Port of Felixstowe, United Kingdom', subtext: 'Largest Container Port in UK', category: 'PORT' },
  { name: 'New York (JFK), United States', subtext: 'John F. Kennedy Air Cargo Center', category: 'AIRPORT' },
  { name: 'Newark Liberty (EWR), United States', subtext: 'New Jersey Air Cargo Gateway', category: 'AIRPORT' },
  { name: 'Port of Los Angeles (LAX), United States', subtext: 'West Coast Gateway', category: 'PORT' },
  { name: 'Chicago O\'Hare (ORD), United States', subtext: 'Midwest Air Cargo Hub', category: 'AIRPORT' },
  { name: 'Singapore (SIN)', subtext: 'Changi Air Cargo / PSA Singapore Port', category: 'PORT' },
  { name: 'Hong Kong (HKG)', subtext: 'SuperTerminal 1 Air Cargo / Port of HK', category: 'AIRPORT' },
  { name: 'Frankfurt (FRA), Germany', subtext: 'CargoCity Frankfurt • European Hub', category: 'AIRPORT' },
  { name: 'Port of Rotterdam, Netherlands', subtext: 'Largest Port in Europe', category: 'PORT' },
  { name: 'Amsterdam Schiphol (AMS), Netherlands', subtext: 'European Freight Center', category: 'AIRPORT' },
  { name: 'Paris Charles de Gaulle (CDG), France', subtext: 'Major Cargo Hub', category: 'AIRPORT' },
  { name: 'Tokyo Narita (NRT), Japan', subtext: 'International Air Cargo Gateway', category: 'AIRPORT' },
  { name: 'Port of Shanghai, China', subtext: 'World\'s Busiest Container Port', category: 'PORT' },
  { name: 'Shenzhen / Guangzhou, China', subtext: 'Pearl River Delta Cargo Hub', category: 'AIRPORT' },
  { name: 'Sydney Kingsford Smith (SYD), Australia', subtext: 'Port Botany / Air Cargo', category: 'AIRPORT' },
  { name: 'Melbourne (MEL), Australia', subtext: 'Port of Melbourne / Tullamarine', category: 'PORT' },
  { name: 'Toronto Pearson (YYZ), Canada', subtext: 'Major Canadian Freight Hub', category: 'AIRPORT' },
  { name: 'Vancouver Port, Canada', subtext: 'Pacific Gateway Container Port', category: 'PORT' },
  { name: 'Doha Hamad (DOH), Qatar', subtext: 'Qatar Airways Cargo Gateway', category: 'AIRPORT' },
  { name: 'Riyadh (RUH) / Jeddah (JED), Saudi Arabia', subtext: 'King Abdulaziz Sea & Air Port', category: 'PORT' },
  { name: 'Kuwait City (KWI), Kuwait', subtext: 'Shuwaikh Port / International Airport', category: 'AIRPORT' },
  { name: 'Manama, Bahrain', subtext: 'Khalifa Bin Salman Port / BIA Cargo', category: 'PORT' },
  { name: 'Muscat (MCT), Oman', subtext: 'Port Sultan Qaboos / Muscat Air Cargo', category: 'AIRPORT' },
  { name: 'Dhaka (DAC), Bangladesh', subtext: 'Hazrat Shahjalal Air Cargo / Chittagong Port', category: 'PORT' },
  { name: 'Colombo Port (CMB), Sri Lanka', subtext: 'Bandaranaike International / Sea Port', category: 'PORT' },
  { name: 'Kathmandu (KTM), Nepal', subtext: 'Tribhuvan Air Cargo Gateway', category: 'AIRPORT' },
  { name: 'Kuala Lumpur (KUL), Malaysia', subtext: 'KLIA Cargo / Port Klang', category: 'PORT' },
  { name: 'Bangkok Suvarnabhumi (BKK), Thailand', subtext: 'Laem Chabang Port / Air Cargo', category: 'PORT' },
  { name: 'Jakarta (CGK), Indonesia', subtext: 'Tanjung Priok Port / Soekarno-Hatta', category: 'PORT' },
  { name: 'Seoul Incheon (ICN), South Korea', subtext: 'Busan Container Port / Incheon Air', category: 'PORT' },
];

/**
 * Filter countries by search query (case-insensitive, prefix + substring)
 */
export function searchCountries(query: string, maxResults = 8): CountryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_COUNTRIES.slice(0, maxResults);

  const prefixMatches: CountryItem[] = [];
  const containsMatches: CountryItem[] = [];

  for (const country of ALL_COUNTRIES) {
    const nameLower = country.name.toLowerCase();
    if (nameLower.startsWith(q) || country.code.toLowerCase() === q) {
      prefixMatches.push(country);
    } else if (nameLower.includes(q)) {
      containsMatches.push(country);
    }
  }

  return [...prefixMatches, ...containsMatches].slice(0, maxResults);
}

/**
 * Filter cargo receipt & destination locations by search query
 */
export function searchCargoLocations(query: string, maxResults = 8): CargoLocationItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return CARGO_LOCATIONS.slice(0, maxResults);

  const results: CargoLocationItem[] = [];

  // 1. First check predefined cargo locations
  for (const loc of CARGO_LOCATIONS) {
    if (
      loc.name.toLowerCase().includes(q) ||
      loc.subtext.toLowerCase().includes(q)
    ) {
      results.push(loc);
    }
  }

  // 2. Also match from Countries dataset if user is typing a country name
  for (const c of ALL_COUNTRIES) {
    if (c.name.toLowerCase().includes(q)) {
      // Check if not already in results
      if (!results.some((r) => r.name.toLowerCase() === c.name.toLowerCase())) {
        results.push({
          name: c.name,
          subtext: `Country Gateway • ${c.flag}`,
          category: 'COUNTRY',
        });
      }
    }
  }

  return results.slice(0, maxResults);
}

/**
 * Automatically identify international telephone dialing code from country name or code
 */
export function getCountryDialCode(countryNameOrCode: string): string {
  if (!countryNameOrCode) return '+91';
  const q = countryNameOrCode.trim().toLowerCase();

  // 1. Direct match on code or name
  const match = ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q
  );
  if (match) return match.dialCode;

  // 2. Common aliases & abbreviations
  if (q.includes('emirates') || q === 'uae' || q === 'dubai' || q.includes('arab emirates')) return '+971';
  if (q.includes('united states') || q === 'usa' || q === 'us' || q === 'america') return '+1';
  if (q.includes('united kingdom') || q === 'uk' || q === 'gb' || q === 'britain' || q === 'england') return '+44';
  if (q.includes('india') || q === 'in') return '+91';
  if (q.includes('canada') || q === 'ca') return '+1';
  if (q.includes('australia') || q === 'au') return '+61';
  if (q.includes('singapore') || q === 'sg') return '+65';
  if (q.includes('saudi') || q === 'ksa') return '+966';
  if (q.includes('germany') || q === 'de') return '+49';
  if (q.includes('france') || q === 'fr') return '+33';
  if (q.includes('japan') || q === 'jp') return '+81';
  if (q.includes('china') || q === 'cn') return '+86';
  if (q.includes('qatar') || q === 'qa') return '+974';
  if (q.includes('kuwait') || q === 'kw') return '+965';
  if (q.includes('oman') || q === 'om') return '+968';
  if (q.includes('bahrain') || q === 'bh') return '+973';

  // 3. Substring match
  const sub = ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
  );
  if (sub) return sub.dialCode;

  return '+91';
}
