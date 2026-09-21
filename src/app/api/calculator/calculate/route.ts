import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, getUserAccessState } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

interface PackageInput {
  length: number;
  width: number;
  height: number;
  actualWeight: number;
  quantity?: number;
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response!;
    }
    if (access.user.isAdditionalUser) {
      const assigned = access.user.assignedModules || [];
      if (!assigned.includes('WEIGHT_CALCULATOR') && !assigned.includes('RATE_CALCULATOR')) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to access the Weight or Rate Calculator modules.' },
          { status: 403 }
        );
      }
    }

    // 1. Session Verification
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    // 2. Fetch User
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: new Date() } },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const activeSub = user.subscriptions[0];
    const isDemo = !activeSub && user.role !== 'ADMIN';
    const accessStatus = await getUserAccessState(user.id);

    // Enforce Access Validation
    if (accessStatus === 'DEMO_EXPIRED' || accessStatus === 'SUBSCRIPTION_EXPIRED') {
      return NextResponse.json({
        error: 'Your 10-day demo period has ended. Subscribe to a plan to continue calculations.',
        demoLimitReached: true,
        code: accessStatus,
        calculationsUsed: user.calculationsCount,
      }, { status: 403 });
    }

    // Enforce Demo 10-Calculation Limit
    if (isDemo && user.calculationsCount >= 10) {
      return NextResponse.json({
        error: 'You have used all 10 Weight Calculator calculations included in the demo. Subscribe to a plan to continue.',
        demoLimitReached: true,
        code: 'DEMO_LIMIT_REACHED',
        calculationsUsed: user.calculationsCount,
        calculationsLimit: 10,
      }, { status: 403 });
    }

    // 3. Parse and validate inputs
    const { unit, divisor, packages, rateCardId, destination } = await req.json();

    if (!unit || !divisor || !packages || !Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json({ error: 'Invalid calculation inputs.' }, { status: 400 });
    }

    const parsedDivisor = parseFloat(divisor);
    if (isNaN(parsedDivisor) || parsedDivisor <= 0) {
      return NextResponse.json({ error: 'Divisor must be a positive number.' }, { status: 400 });
    }

    // 4. Perform volumetric math
    let totalActualWeight = 0;
    let totalVolumetricWeight = 0;
    const processedPackages = [];

    for (let i = 0; i < packages.length; i++) {
      const pkg: PackageInput = packages[i];
      const length = parseFloat(pkg.length as any);
      const width = parseFloat(pkg.width as any);
      const height = parseFloat(pkg.height as any);
      const actualWeight = parseFloat(pkg.actualWeight as any);
      const quantity = parseInt(pkg.quantity as any) || 1;
      const multiplier = parseInt((pkg as any).multiplier as any) || 1;
      const effectiveQty = Math.max(1, quantity) * Math.max(1, multiplier);

      if (isNaN(length) || length < 0 ||
          isNaN(width) || width < 0 ||
          isNaN(height) || height < 0 ||
          isNaN(actualWeight) || actualWeight < 0 ||
          effectiveQty <= 0) {
        return NextResponse.json({ error: 'Package dimensions and weight must be non-negative numbers.' }, { status: 400 });
      }

      if (length === 0 && width === 0 && height === 0 && actualWeight === 0) {
        return NextResponse.json({ error: 'Package must have either positive weight or dimensions.' }, { status: 400 });
      }

      // Calculate volumetric weight: (L * W * H) / Divisor * Quantity
      const volumetricWeight = parsedDivisor > 0 ? ((length * width * height) / parsedDivisor) * effectiveQty : 0;
      const totalPkgActual = actualWeight * effectiveQty;

      totalActualWeight += totalPkgActual;
      totalVolumetricWeight += volumetricWeight;

      processedPackages.push({
        length,
        width,
        height,
        actualWeight: totalPkgActual,
        volumetricWeight: parseFloat(volumetricWeight.toFixed(3)),
        volumetricWeightPerUnit: parseFloat((volumetricWeight / effectiveQty).toFixed(3)),
        totalChargeableWeight: parseFloat(Math.max(totalPkgActual, volumetricWeight).toFixed(3)),
        quantity: effectiveQty,
      });
    }

    // Package-level Chargeable Weight Evaluation Logic:
    // Step 3 — Determine each package's chargeable weight: MAX(Package Actual Weight, Package Volumetric Weight)
    // Step 4 — Sum the package-level chargeable weights: SUM(Package Chargeable Weight for every package)
    const finalActualWeight = parseFloat(totalActualWeight.toFixed(3));
    const finalVolumetricWeight = parseFloat(totalVolumetricWeight.toFixed(3));
    const totalChargeableWeight = parseFloat(
      processedPackages.reduce((sum, pkg) => sum + pkg.totalChargeableWeight, 0).toFixed(3)
    );

    // 4.5. Shipping Price Engine using Dynamic Rate Slabs
    let calculatedCost: number | null = null;
    let selectedRateCard = null;

    if (rateCardId) {
      if (rateCardId === 'AUTOMATIC') {
        selectedRateCard = await prisma.rateCard.findFirst({
          where: {
            OR: [
              { ownerType: 'USER', ownerId: user.id, active: true },
              { ownerType: 'SYSTEM', active: true },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        selectedRateCard = await prisma.rateCard.findUnique({
          where: { id: rateCardId },
        });
      }

      if (selectedRateCard) {
        if (
          selectedRateCard.ownerType === 'SYSTEM' &&
          activeSub &&
          !activeSub.systemRateCardAccess
        ) {
          return NextResponse.json({
            error: 'Selected rate card is not applicable (requires System Rate Card Access entitlement).',
          }, { status: 403 });
        }

        const pricingWeight = Math.max(totalChargeableWeight, selectedRateCard.minimumWeight);
        const targetDest = destination || 'ROI';

        // Local weight slab KG calculator
        const getSlabWeightInKg = (s: any) => {
          return s.unit.toUpperCase() === 'GRAMS' ? s.weight / 1000 : s.weight;
        };

        // Dynamic slabs compatibility mapper
        let slabsArray = (selectedRateCard.slabs as any[]) || [];
        let regionsArray = (selectedRateCard.regions as any[]) || [];

        const isOldFormat = slabsArray.length > 0 && ('destination' in slabsArray[0] || 'base250g' in slabsArray[0]);
        if (isOldFormat) {
          if (selectedRateCard.pricingModel === 'PER_KG') {
            slabsArray = [{ id: 'slabkg', type: 'BASE', weight: 1, unit: 'KG', label: 'Rate/KG' }];
            regionsArray = slabsArray.map((item: any, idx: number) => ({
              id: `reg-${idx}`,
              name: item.destination || `Region ${idx + 1}`,
              cargoRate: 0,
              airRatePerKg: item.perKg || item.airRatePerKg || 0,
              surfaceRatePerKg: item.perKg || item.surfaceRatePerKg || 0,
              prices: [{ slabId: 'slabkg', amount: item.perKg || 0 }]
            }));
          } else {
            slabsArray = [
              { id: 'slab250', type: 'BASE', weight: 250, unit: 'GRAMS', label: 'Base 250G' },
              { id: 'slab500', type: 'BASE', weight: 500, unit: 'GRAMS', label: 'Base 500G' },
              { id: 'slabadd', type: 'ADDITIONAL', weight: 500, unit: 'GRAMS', label: 'Add 500G' }
            ];
            regionsArray = slabsArray.map((item: any, idx: number) => ({
              id: `reg-${idx}`,
              name: item.destination || `Region ${idx + 1}`,
              cargoRate: item.cargoRate || 0,
              prices: [
                { slabId: 'slab250', amount: item.base250g || 0 },
                { slabId: 'slab500', amount: item.base500g || 0 },
                { slabId: 'slabadd', amount: item.add500g || 0 }
              ]
            }));
          }
        }

        const matchedRegion = (regionsArray as any[]).find(
          (r: any) => r.name.toLowerCase() === targetDest.toLowerCase()
        ) || (regionsArray as any[]).find(
          (r: any) => r.name.toLowerCase() === 'roi'
        );

        if (matchedRegion) {
          const cargoThreshold = selectedRateCard.cargoThreshold ?? 5.0;
          const cargoRate = parseFloat((matchedRegion as any).cargoRate as any) || 0;

          if (cargoRate > 0 && pricingWeight > cargoThreshold) {
            calculatedCost = parseFloat((pricingWeight * cargoRate).toFixed(2));
          } else {
            if (selectedRateCard.pricingModel === 'LTL_PTL') {
              const ranges = (matchedRegion as any).weightRanges || [];
              let matchedRange = null;
              for (const r of ranges) {
                const fromInKg = r.unit.toUpperCase() === 'GRAMS' ? r.fromWeight / 1000 : r.fromWeight;
                const toInKg = r.unit.toUpperCase() === 'GRAMS' ? r.toWeight / 1000 : r.toWeight;
                if (pricingWeight >= fromInKg && pricingWeight <= toInKg) {
                  matchedRange = r;
                  break;
                }
              }
              if (matchedRange) {
                calculatedCost = pricingWeight * (parseFloat(matchedRange.rate.toString()) || 0);
                calculatedCost = parseFloat(calculatedCost.toFixed(2));
              } else {
                return NextResponse.json({
                  error: `Weight of ${pricingWeight} KG does not match any configured LTL/PTL weight range for destination region "${targetDest}".`,
                }, { status: 400 });
              }
            } else if (selectedRateCard.pricingModel === 'PER_KG') {
              const perKg = (matchedRegion as any).surfaceRatePerKg || (matchedRegion as any).perKg || (matchedRegion as any).airRatePerKg || 0;
              calculatedCost = parseFloat((pricingWeight * perKg).toFixed(2));
            } else {
              // Slab pricing model
              const baseSlabs = (slabsArray as any[]).filter(s => s.type === 'BASE').sort((a, b) => getSlabWeightInKg(a) - getSlabWeightInKg(b));
              const addSlabs = (slabsArray as any[]).filter(s => s.type === 'ADDITIONAL').sort((a, b) => getSlabWeightInKg(a) - getSlabWeightInKg(b));

              const priceMap = new Map((matchedRegion as any).prices.map((p: any) => [p.slabId, parseFloat(p.amount) || 0]));

              let baseSlabUsed = null;
              for (const s of baseSlabs) {
                if (pricingWeight <= getSlabWeightInKg(s)) {
                  baseSlabUsed = s;
                  break;
                }
              }

              if (baseSlabUsed) {
                calculatedCost = Number(priceMap.get(baseSlabUsed.id)) || 0;
              } else {
                const largestBaseSlab = baseSlabs[baseSlabs.length - 1];
                const baseLimit = largestBaseSlab ? getSlabWeightInKg(largestBaseSlab) : 0.0;
                const baseCost = largestBaseSlab ? (Number(priceMap.get(largestBaseSlab.id)) || 0) : 0;

                const remainingWeight = pricingWeight - baseLimit;
                const addSlab = addSlabs[0];
                const addLimit = addSlab ? getSlabWeightInKg(addSlab) : 0.5;
                const addRate = addSlab ? (Number(priceMap.get(addSlab.id)) || 0) : 0;

                const extraSlabsCount = Math.ceil(remainingWeight / addLimit);
                calculatedCost = baseCost + extraSlabsCount * addRate;
              }
              calculatedCost = parseFloat((calculatedCost as number).toFixed(2));
            }
          }
        }
      }
    }

    // 5. Save calculation in history
    const savedCalculation = await prisma.calculation.create({
      data: {
        userId: user.id,
        unit,
        divisor: parsedDivisor,
        packageCount: packages.reduce((sum: number, p: any) => sum + ((parseInt(p.quantity as any) || 1) * (parseInt((p as any).multiplier as any) || 1)), 0),
        actualWeight: finalActualWeight,
        volumetricWeight: finalVolumetricWeight,
        chargeableWeight: totalChargeableWeight,
        packages: processedPackages as any,
        shippingCost: calculatedCost,
        rateCardId: selectedRateCard?.id || null,
        rateCardName: selectedRateCard?.rateCardName || null,
        destination: selectedRateCard ? destination || 'ROI' : null,
      },
    });

    // 6. Handle history retention limit (20 calculations)
    const excessRecords = await prisma.calculation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      select: { id: true },
    });

    if (excessRecords.length > 0) {
      const idsToDelete = excessRecords.map((r) => r.id);
      await prisma.calculation.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    // 7. Increment Demo calculation usage counter (atomic check-and-increment)
    let finalCalculationsCount = user.calculationsCount;
    if (isDemo) {
      const updateResult = await prisma.user.updateMany({
        where: {
          id: user.id,
          calculationsCount: { lt: 10 },
        },
        data: {
          calculationsCount: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        return NextResponse.json({
          error: 'You have used all 10 Weight Calculator calculations included in the demo. Subscribe to a plan to continue.',
          demoLimitReached: true,
          code: 'DEMO_LIMIT_REACHED',
          calculationsUsed: 10,
          calculationsLimit: 10,
        }, { status: 403 });
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { calculationsCount: true },
      });
      finalCalculationsCount = updatedUser?.calculationsCount ?? (user.calculationsCount + 1);
    }

    return NextResponse.json({
      success: true,
      calculation: savedCalculation,
      summary: {
        totalActualWeight: finalActualWeight,
        totalVolumetricWeight: finalVolumetricWeight,
        totalChargeableWeight: totalChargeableWeight,
        divisor: parsedDivisor,
        unit,
        shippingCost: calculatedCost,
        rateCardName: selectedRateCard?.rateCardName || null,
      },
      demoState: {
        isDemo,
        calculationsUsed: finalCalculationsCount,
        calculationsLimit: isDemo ? 10 : 99999,
        demoLimitReached: isDemo ? finalCalculationsCount >= 10 : (accessStatus as string) === 'DEMO_EXPIRED' || (accessStatus as string) === 'SUBSCRIPTION_EXPIRED',
        accessStatus,
      },
    });
  } catch (error: any) {
    console.error('Weight calculation error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
