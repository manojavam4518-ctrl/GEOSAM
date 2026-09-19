import { prisma } from '@/lib/prisma';

export interface PincodeInfo {
  pincode: string;
  city: string;
  state: string;
  district: string;
  postOffices: string[];
  postalCircle?: string;
  postalRegion?: string;
  postalDivision?: string;
  officeType?: string;
  deliveryStatus?: string;
  geoRegion: string; // commercial region: METRO, SOUTH, WEST, NORTH, etc.
  zone: string;      // geographical zone
  isMetro: boolean;
  isServiceable: boolean;
  hasOverride: boolean;
}

const DEFAULT_STATE_MAPPINGS: Record<string, { region: string; zone: string }> = {
  'karnataka': { region: 'SOUTH', zone: 'South' },
  'tamil nadu': { region: 'SOUTH', zone: 'South' },
  'kerala': { region: 'SOUTH', zone: 'South' },
  'andhra pradesh': { region: 'SOUTH', zone: 'South' },
  'telangana': { region: 'SOUTH', zone: 'South' },
  'puducherry': { region: 'SOUTH', zone: 'South' },
  'maharashtra': { region: 'WEST', zone: 'West' },
  'gujarat': { region: 'WEST', zone: 'West' },
  'goa': { region: 'WEST', zone: 'West' },
  'delhi': { region: 'NORTH', zone: 'North' },
  'haryana': { region: 'NORTH', zone: 'North' },
  'punjab': { region: 'NORTH', zone: 'North' },
  'uttar pradesh': { region: 'NORTH', zone: 'North' },
  'uttarakhand': { region: 'NORTH', zone: 'North' },
  'himachal pradesh': { region: 'NORTH', zone: 'North' },
  'jammu & kashmir': { region: 'NORTH', zone: 'North' },
  'rajasthan': { region: 'NORTH', zone: 'North' },
  'west bengal': { region: 'EAST', zone: 'East' },
  'bihar': { region: 'EAST', zone: 'East' },
  'jharkhand': { region: 'EAST', zone: 'East' },
  'odisha': { region: 'EAST', zone: 'East' },
  'chhattisgarh': { region: 'EAST', zone: 'East' },
  'madhya pradesh': { region: 'WEST', zone: 'West' },
  'assam': { region: 'NORTH EAST', zone: 'North East' },
  'meghalaya': { region: 'NORTH EAST', zone: 'North East' },
  'manipur': { region: 'NORTH EAST', zone: 'North East' },
  'tripura': { region: 'NORTH EAST', zone: 'North East' },
  'mizoram': { region: 'NORTH EAST', zone: 'North East' },
  'nagaland': { region: 'NORTH EAST', zone: 'North East' },
  'arunachal pradesh': { region: 'NORTH EAST', zone: 'North East' },
  'sikkim': { region: 'NORTH EAST', zone: 'North East' }
};

const DEFAULT_METRO_CITIES = [
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'chennai',
  'hyderabad', 'kolkata', 'calcutta', 'pune', 'ahmedabad'
];

// In-memory caches to speed up repeated queries
const pincodeCache = new Map<string, PincodeInfo>();
const metroLocationCache = new Map<string, boolean>();
const stateRegionCache = new Map<string, { geoRegion: string; zone: string }>();

export class RegionMappingService {
  /**
   * Resolves the commercial region and geographical zone for a location.
   * Metro location mappings take priority over state mappings.
   */
  static async getMapping(state: string, city: string): Promise<{ geoRegion: string; zone: string; isMetro: boolean }> {
    const cleanState = state.trim().toLowerCase();
    const cleanCity = city.trim().toLowerCase();

    // 1. Check if city is a configured Metro Location in DB
    if (metroLocationCache.has(cleanCity)) {
      if (metroLocationCache.get(cleanCity)) {
        const zone = DEFAULT_STATE_MAPPINGS[cleanState]?.zone || 'ROI';
        return { geoRegion: 'METRO', zone, isMetro: true };
      }
    } else {
      try {
        const metroLoc = await prisma.metroLocation.findFirst({
          where: {
            name: { equals: city.trim(), mode: 'insensitive' },
            isActive: true
          }
        });
        metroLocationCache.set(cleanCity, !!metroLoc);
        if (metroLoc) {
          const zone = DEFAULT_STATE_MAPPINGS[cleanState]?.zone || 'ROI';
          return { geoRegion: 'METRO', zone, isMetro: true };
        }
      } catch (e) {
        console.error('Failed to query metro location mapping:', e);
      }
    }

    // 2. Check if city is in default metro list
    if (DEFAULT_METRO_CITIES.includes(cleanCity)) {
      const zone = DEFAULT_STATE_MAPPINGS[cleanState]?.zone || 'ROI';
      return { geoRegion: 'METRO', zone, isMetro: true };
    }

    // 3. Check State Mappings in DB
    if (stateRegionCache.has(cleanState)) {
      const mapped = stateRegionCache.get(cleanState)!;
      return { geoRegion: mapped.geoRegion, zone: mapped.zone, isMetro: false };
    } else {
      try {
        const stateMap = await prisma.stateRegionMapping.findFirst({
          where: {
            state: { equals: state.trim(), mode: 'insensitive' }
          }
        });
        if (stateMap) {
          const res = { geoRegion: stateMap.regionName, zone: stateMap.zoneName };
          stateRegionCache.set(cleanState, res);
          return { ...res, isMetro: false };
        }
      } catch (e) {
        console.error('Failed to query state mapping configuration:', e);
      }
    }

    // 4. Fallback to default state mappings
    const mapped = DEFAULT_STATE_MAPPINGS[cleanState];
    if (mapped) {
      return { geoRegion: mapped.region, zone: mapped.zone, isMetro: false };
    }

    return { geoRegion: 'ROI', zone: 'ROI', isMetro: false };
  }
}

export class PincodeService {
  /**
   * Looks up pincode details from the centralized Pincode Master database.
   * Fallbacks to standard prefix rules if pincode does not exist in DB.
   */
  static async lookup(pincode: string): Promise<PincodeInfo | null> {
    const cleanCode = pincode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return null;
    }

    if (pincodeCache.has(cleanCode)) {
      return pincodeCache.get(cleanCode)!;
    }

    // 1. Database Lookup
    try {
      const record = await prisma.pincodeMapping.findUnique({
        where: { pincode: cleanCode }
      });

      if (record) {
        const info: PincodeInfo = {
          pincode: record.pincode,
          city: record.city,
          state: record.state,
          district: record.district || '',
          postOffices: (record.postOffices as string[]) || [],
          postalCircle: record.postalCircle || undefined,
          postalRegion: record.postalRegion || undefined,
          postalDivision: record.postalDivision || undefined,
          officeType: record.officeType || undefined,
          deliveryStatus: record.deliveryStatus || undefined,
          geoRegion: record.geoRegion,
          zone: record.zone,
          isMetro: record.isMetro,
          isServiceable: record.isServiceable,
          hasOverride: record.hasOverride
        };
        pincodeCache.set(cleanCode, info);
        return info;
      }
    } catch (e) {
      console.error('Failed to lookup pincode from master database:', e);
    }

    // 2. Fallback prefix heuristics (standard postal circles & metros)
    const prefixesToStateCity: Record<string, { city: string; state: string }> = {
      '110': { city: 'Delhi', state: 'Delhi' },
      '400': { city: 'Mumbai', state: 'Maharashtra' },
      '560': { city: 'Bengaluru', state: 'Karnataka' },
      '600': { city: 'Chennai', state: 'Tamil Nadu' },
      '700': { city: 'Kolkata', state: 'West Bengal' },
      '500': { city: 'Hyderabad', state: 'Telangana' }
    };

    const prefix3 = cleanCode.substring(0, 3);
    const resolved = prefixesToStateCity[prefix3];

    let city = resolved?.city || 'Unknown City';
    let state = resolved?.state || 'Unknown State';
    let district = resolved?.city || 'Unknown District';

    // Heuristics based on first digit of pincode
    if (!resolved) {
      const zoneDigit = cleanCode.charAt(0);
      switch (zoneDigit) {
        case '1': state = 'Delhi/Punjab/Haryana'; break;
        case '2': state = 'Uttar Pradesh/Uttarakhand'; break;
        case '3': state = 'Gujarat/Rajasthan'; break;
        case '4': state = 'Maharashtra/MP/Chhattisgarh'; break;
        case '5': state = 'Andhra Pradesh/Karnataka'; break;
        case '6': state = 'Tamil Nadu/Kerala'; break;
        case '7': state = 'West Bengal/North East'; break;
        case '8': state = 'Bihar/Jharkhand'; break;
      }
    }

    // Resolve commercial region & zone using dynamic mapping service
    const mapping = await RegionMappingService.getMapping(state, city);

    return {
      pincode: cleanCode,
      city,
      state,
      district,
      postOffices: [city],
      geoRegion: mapping.geoRegion,
      zone: mapping.zone,
      isMetro: mapping.isMetro,
      isServiceable: true,
      hasOverride: false
    };
  }
}

export class RouteClassificationService {
  /**
   * Classifies the commercial shipping route between two pincodes.
   * Priority:
   * 1. Same City -> "Within City" (Local)
   * 2. Same State -> "Within State" (Regional)
   * 3. Same Zone -> "Within Zone" (Zonal)
   * 4. Destination is Metro -> "Metro"
   * 5. Destination commercial geoRegion (e.g. SOUTH, NORTH, ROI)
   */
  static async classify(originPincode: string, destPincode: string): Promise<{
    origin: PincodeInfo;
    destination: PincodeInfo;
    routeClass: string;
    routeSummary: string;
  } | null> {
    const origin = await PincodeService.lookup(originPincode);
    const destination = await PincodeService.lookup(destPincode);

    if (!origin || !destination) {
      return null;
    }

    let routeClass = 'ROI';

    if (origin.city.toLowerCase() === destination.city.toLowerCase() || origin.pincode.substring(0, 3) === destination.pincode.substring(0, 3)) {
      routeClass = 'Within City';
    } else if (origin.state.toLowerCase() === destination.state.toLowerCase() || origin.pincode.substring(0, 2) === destination.pincode.substring(0, 2)) {
      routeClass = 'Within State';
    } else if (origin.zone.toLowerCase() === destination.zone.toLowerCase() || origin.pincode.substring(0, 1) === destination.pincode.substring(0, 1)) {
      routeClass = 'Within Zone';
    } else if (destination.isMetro) {
      routeClass = 'Metro';
    } else {
      routeClass = destination.geoRegion; // e.g. SOUTH, WEST, etc.
    }

    const routeSummary = `${origin.city} (${origin.geoRegion}) → ${destination.city} (${destination.geoRegion})`;

    return {
      origin,
      destination,
      routeClass,
      routeSummary
    };
  }
}

/**
 * Re-export original helper for backwards compatibility.
 */
export async function getDestinationRegion(origin: string, destination: string): Promise<string> {
  const classification = await RouteClassificationService.classify(origin, destination);
  return classification?.routeClass || 'ROI';
}

