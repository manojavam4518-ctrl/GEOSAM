export const COURIER_LOGOS: Record<string, string> = {
  'Blue Dart': '/assets/couriers/bluedart.svg',
  'Delhivery': '/assets/couriers/delhivery.png',
  'DTDC': '/assets/couriers/dtdc.png',
  'India Post': '/assets/couriers/indiapost.jpg',
  'Shadowfax': '/assets/couriers/shadowfax.png',
  'XpressBees': '/assets/couriers/xpressbees.png',
  'Professional Couriers': '/assets/couriers/professional_couriers.png',
  'Allcargo/GATI': '/assets/couriers/allcargo_gati.png'
};

export const resolveCourierLogo = (name: string, customLogoUrl?: string | null): string | null => {
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    return customLogoUrl.trim();
  }

  if (!name) return null;
  const cleanName = name.trim();

  // Try direct key match
  const logoKey = Object.keys(COURIER_LOGOS).find(
    (key) => key.toLowerCase() === cleanName.toLowerCase()
  );

  if (logoKey) {
    return COURIER_LOGOS[logoKey];
  }

  // Soft match (contains)
  const softKey = Object.keys(COURIER_LOGOS).find((key) => {
    const kLower = key.toLowerCase();
    const nLower = cleanName.toLowerCase();
    return kLower.includes(nLower) || nLower.includes(kLower);
  });

  if (softKey) {
    return COURIER_LOGOS[softKey];
  }

  return null;
};
