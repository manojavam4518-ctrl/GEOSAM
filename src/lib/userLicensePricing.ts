import { prisma } from '@/lib/prisma';

export interface DurationOption {
  months: number;
  standardDays: number;
  label: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { months: 3, standardDays: 90, label: '3 Months' },
  { months: 6, standardDays: 180, label: '6 Months' },
  { months: 12, standardDays: 365, label: '12 Months' },
];

export const DEFAULT_USER_PRICING: Record<number, number> = {
  3: 1499,
  6: 2699,
  12: 4999,
};

/**
 * Retrieves the configured per-user price for a given duration.
 * Reads directly from Super Admin's UserLicensePricing DB table.
 */
export async function getUserLicensePrice(durationMonths: number): Promise<number> {
  const record = await (prisma as any).userLicensePricing.findUnique({
    where: { duration: durationMonths },
  });

  if (record && record.price !== undefined && record.price !== null) {
    return record.price;
  }

  return DEFAULT_USER_PRICING[durationMonths] || 1499;
}

/**
 * Retrieves all active Super Admin configured prices for 3, 6, and 12 months.
 */
export async function getAllUserLicensePricings() {
  const records = await (prisma as any).userLicensePricing.findMany({
    where: { active: true },
    orderBy: { duration: 'asc' },
  });

  const priceMap: Record<number, number> = { ...DEFAULT_USER_PRICING };
  records.forEach((r: any) => {
    priceMap[r.duration] = r.price;
  });

  return DURATION_OPTIONS.map((opt) => ({
    duration: opt.months,
    label: opt.label,
    standardDays: opt.standardDays,
    price: priceMap[opt.months] || DEFAULT_USER_PRICING[opt.months] || 1499,
  }));
}

export interface EligibilityResult {
  hasActiveSubscription: boolean;
  subscriptionEndDate: string | null;
  remainingSubscriptionDays: number;
  selectedDurationMonths: number;
  selectedStandardDays: number;
  eligibleForFullDuration: boolean;
  warningMessage?: string;
  maxAvailableDays: number;
  configuredPricePerUser: number;
  calculatedPricePerUser: number;
  dailyRate: number;
  isProrated: boolean;
  usersCount: number;
  totalPayable: number;
  actualExpiryDate: string | null;
}

/**
 * Calculates parent-subscription bound license duration, proration, and payable amounts.
 * Server-side source of truth for license purchases.
 */
export async function calculateLicenseEligibility(
  organizationId: string,
  durationMonths: number,
  usersCount: number = 1
): Promise<EligibilityResult> {
  const now = new Date();

  // Find active master subscription for the organization
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscriptions: {
        where: {
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
  });

  let activeSub = org?.subscriptions?.[0] || null;

  if (!activeSub && org) {
    // Check if subscription was created under ownerId
    activeSub = await prisma.subscription.findFirst({
      where: {
        userId: org.ownerId,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      orderBy: { endDate: 'desc' },
    });
  }

  const durationOption =
    DURATION_OPTIONS.find((d) => d.months === durationMonths) || DURATION_OPTIONS[0];
  const standardDays = durationOption.standardDays;
  const configuredPrice = await getUserLicensePrice(durationOption.months);
  const dailyRate = parseFloat((configuredPrice / standardDays).toFixed(4));

  const safeUsersCount = Math.max(1, Math.floor(usersCount || 1));

  if (!activeSub) {
    return {
      hasActiveSubscription: false,
      subscriptionEndDate: null,
      remainingSubscriptionDays: 0,
      selectedDurationMonths: durationOption.months,
      selectedStandardDays: standardDays,
      eligibleForFullDuration: false,
      warningMessage:
        "Your organization does not have an active subscription. A valid main subscription is required before purchasing additional user licenses.",
      maxAvailableDays: 0,
      configuredPricePerUser: configuredPrice,
      calculatedPricePerUser: 0,
      dailyRate,
      isProrated: false,
      usersCount: safeUsersCount,
      totalPayable: 0,
      actualExpiryDate: null,
    };
  }

  const subEndDate = new Date(activeSub.endDate);
  const diffMs = subEndDate.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (remainingDays <= 0) {
    return {
      hasActiveSubscription: false,
      subscriptionEndDate: subEndDate.toISOString(),
      remainingSubscriptionDays: 0,
      selectedDurationMonths: durationOption.months,
      selectedStandardDays: standardDays,
      eligibleForFullDuration: false,
      warningMessage:
        "Your organization's subscription has expired. Additional user licenses cannot be purchased until the main subscription is renewed.",
      maxAvailableDays: 0,
      configuredPricePerUser: configuredPrice,
      calculatedPricePerUser: 0,
      dailyRate,
      isProrated: false,
      usersCount: safeUsersCount,
      totalPayable: 0,
      actualExpiryDate: null,
    };
  }

  // Check if requested duration exceeds remaining days
  if (standardDays > remainingDays) {
    // Prorate using consistent daily formula
    const calculatedPricePerUser = Math.round(dailyRate * remainingDays);
    const totalPayable = calculatedPricePerUser * safeUsersCount;

    return {
      hasActiveSubscription: true,
      subscriptionEndDate: subEndDate.toISOString(),
      remainingSubscriptionDays: remainingDays,
      selectedDurationMonths: durationOption.months,
      selectedStandardDays: standardDays,
      eligibleForFullDuration: false,
      warningMessage: `${durationOption.months}-month user license cannot be purchased because your organization's subscription has only ${remainingDays} days remaining. User licenses cannot extend beyond the organization's subscription expiry date.`,
      maxAvailableDays: remainingDays,
      configuredPricePerUser: configuredPrice,
      calculatedPricePerUser,
      dailyRate,
      isProrated: true,
      usersCount: safeUsersCount,
      totalPayable,
      actualExpiryDate: subEndDate.toISOString(),
    };
  }

  // Full duration is eligible
  const fullExpiry = new Date(now.getTime() + standardDays * 24 * 60 * 60 * 1000);
  const totalPayable = configuredPrice * safeUsersCount;

  return {
    hasActiveSubscription: true,
    subscriptionEndDate: subEndDate.toISOString(),
    remainingSubscriptionDays: remainingDays,
    selectedDurationMonths: durationOption.months,
    selectedStandardDays: standardDays,
    eligibleForFullDuration: true,
    maxAvailableDays: standardDays,
    configuredPricePerUser: configuredPrice,
    calculatedPricePerUser: configuredPrice,
    dailyRate,
    isProrated: false,
    usersCount: safeUsersCount,
    totalPayable,
    actualExpiryDate: fullExpiry.toISOString(),
  };
}
