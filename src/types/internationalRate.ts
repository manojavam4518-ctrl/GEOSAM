export interface InternationalOtherCharge {
  id: string;
  name: string;
  percentage?: number | null;
  fixedRate?: number | null;
}

export interface InternationalCountryRate {
  id: string;
  country: string;
  freightType: 'Sea Freight' | 'Air Freight';
  perKgRate: number;
  tat?: string;
  otherCharges: InternationalOtherCharge[];
  active?: boolean;
}

export const COUNTRIES_LIST: string[] = [
  'United States (USA)',
  'United Kingdom (UK)',
  'United Arab Emirates (UAE)',
  'India',
  'Germany',
  'Canada',
  'Australia',
  'Singapore',
  'Japan',
  'France',
  'Saudi Arabia',
  'Qatar',
  'Oman',
  'Kuwait',
  'Bahrain',
  'China',
  'Hong Kong',
  'Thailand',
  'Malaysia',
  'Vietnam',
  'Netherlands',
  'Italy',
  'Spain',
  'Switzerland',
  'Sweden',
  'New Zealand',
  'South Korea',
  'South Africa',
  'Brazil',
  'Mexico',
  'Indonesia',
  'Philippines',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Egypt',
  'Turkey',
  'Poland',
  'Ireland',
  'Belgium',
  'Austria',
  'Denmark',
  'Norway',
  'Finland',
  'Portugal',
  'Greece',
  'Israel',
  'Russia',
  'Argentina',
  'Chile',
  'Colombia',
];
