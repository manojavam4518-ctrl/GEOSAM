import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, getUserAccessState } from '@/lib/auth';
import { getDestinationRegion, RouteClassificationService } from '@/utils/pincodeEngine';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CALCULATOR');
    if (!access.authorized) {
      return access.response!;
    }

    // 1. Session Verification
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    // 2. Fetch User and Access Validation
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

    if (accessStatus === 'DEMO_EXPIRED' || accessStatus === 'SUBSCRIPTION_EXPIRED') {
      return NextResponse.json({
        error: 'Your demo/subscription has expired. Please subscribe to continue.',
        code: accessStatus,
      }, { status: 403 });
    }

    if (isDemo && user.calculationsCount >= 10) {
      return NextResponse.json({
        error: 'You have used all 10 Weight Calculator calculations included in the demo. Subscribe to a plan to continue.',
        demoLimitReached: true,
        code: 'DEMO_LIMIT_REACHED',
        calculationsUsed: user.calculationsCount,
        calculationsLimit: 10,
      }, { status: 403 });
    }

    // 3. Parse Inputs
    const {
      originPincode,
      destinationPincode,
      weight,
      serviceMode,
      selectedCardIds,
      serviceType, // 'Domestic' or 'International'
      freightType, // 'Sea Freight' or 'Air Freight' for International
      destinationCountry, // Destination country for International
      courierCompanyId, // Optional
      rateCardId, // Optional
    } = await req.json();

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json({ error: 'Weight must be a positive number.' }, { status: 400 });
    }

    const isIntl = serviceType === 'International';

    // 4. Handle International vs Domestic Validation & Calculations
    let classification: any = null;
    let region = 'ROI';

    if (!isIntl) {
      if (!originPincode || !destinationPincode) {
        return NextResponse.json({ error: 'Origin and destination pincodes are required for Domestic calculations.' }, { status: 400 });
      }

      classification = await RouteClassificationService.classify(originPincode, destinationPincode);
      if (!classification) {
        return NextResponse.json({ error: 'Origin and destination pincodes must be valid 6-digit numbers.' }, { status: 400 });
      }

      if (!classification.origin.isServiceable) {
        return NextResponse.json({ error: `Origin pincode ${originPincode} is currently unserviceable.` }, { status: 400 });
      }
      if (!classification.destination.isServiceable) {
        return NextResponse.json({ error: `Destination pincode ${destinationPincode} is currently unserviceable.` }, { status: 400 });
      }

      region = classification.routeClass;
    } else {
      if (!destinationCountry) {
        return NextResponse.json({ error: 'Destination country is required for International calculations.' }, { status: 400 });
      }
      if (!freightType) {
        return NextResponse.json({ error: 'Freight type (Sea Freight / Air Freight) is required for International calculations.' }, { status: 400 });
      }
    }

    // 5. Fetch Courier Companies to map names
    const companies = await prisma.courierCompany.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      }
    });
    const companyMap = new Map(companies.map(c => [c.id, c.name]));

    // 6. Fetch Target Rate Cards (only selected active ones)
    const queryCardIds = Array.isArray(selectedCardIds) ? selectedCardIds : [];

    const activeCards = await prisma.rateCard.findMany({
      where: {
        active: true,
        ...(serviceType === 'International' ? {} : { useForComparison: true }),
        OR: [
          { ownerType: 'SYSTEM' },
          { ownerType: 'USER', ownerId: user.id },
        ],
        // STRICT Isolation of Domestic / International calculations!
        serviceType: serviceType || 'Domestic',
        ...(courierCompanyId && courierCompanyId !== 'ALL' ? { courierCompanyId } : {}),
        ...(rateCardId && rateCardId !== 'ALL' && rateCardId !== 'AUTOMATIC' ? { id: rateCardId } : {}),
        ...(queryCardIds.length > 0 ? { id: { in: queryCardIds } } : {}),
      },
    });

    // 7. Calculate Pricing per Card
    const results = [];

    if (isIntl) {
      const formattedFreight = freightType === 'Sea Freight' ? 'Sea Freight' : 'Air Freight';
      
      for (const card of activeCards) {
        const companyName = companyMap.get(card.courierCompanyId || '') || card.rateCardName || 'Unknown Courier';

        // Entitlement guard for system cards
        if (card.ownerType === 'SYSTEM' && activeSub && !activeSub.systemRateCardAccess) {
          continue;
        }

        const intlRates: any[] = Array.isArray((card as any).internationalRates) ? (card as any).internationalRates : [];
        const match = intlRates.find(
          (r: any) =>
            r.freightType === formattedFreight &&
            r.country.toLowerCase() === destinationCountry.toLowerCase() &&
            r.active !== false
        );

        if (!match) {
          results.push({
            id: card.id,
            name: card.rateCardName,
            courier: companyName,
            service: `${formattedFreight} — ${destinationCountry}`,
            serviceType: 'International',
            freightType: formattedFreight,
            destinationCountry,
            pricingModel: 'PER_KG',
            cost: null,
            eligible: false,
            errorMessage: `No ${formattedFreight} rate configured for ${companyName} → ${destinationCountry}.`,
            method: 'Unavailable',
            formula: 'None',
            breakdown: {},
          });
          continue;
        }

        const perKgRate = Number(match.perKgRate) || 0;
        const baseFreight = parsedWeight * perKgRate;
        const otherCharges: any[] = Array.isArray(match.otherCharges) ? match.otherCharges : [];
        const tat = match.tat || null;

        let totalOtherCharges = 0;
        const chargeDetails = otherCharges.map((c: any) => {
          const pct = c.percentage !== null && c.percentage !== undefined && !isNaN(Number(c.percentage)) ? Number(c.percentage) : null;
          const fix = c.fixedRate !== null && c.fixedRate !== undefined && !isNaN(Number(c.fixedRate)) ? Number(c.fixedRate) : null;

          const pctVal = pct !== null && pct > 0 ? (baseFreight * pct) / 100 : 0;
          const fixVal = fix !== null && fix > 0 ? fix : 0;
          const amount = pctVal + fixVal;
          totalOtherCharges += amount;
          return {
            name: c.name,
            percentage: pct,
            fixedRate: fix,
            amount,
          };
        });

        const totalShippingCharge = baseFreight + totalOtherCharges;

        results.push({
          id: card.id,
          name: card.rateCardName,
          courier: companyName,
          service: `${formattedFreight} (${destinationCountry})`,
          serviceType: 'International',
          freightType: formattedFreight,
          destinationCountry,
          perKgRate,
          baseFreight,
          tat,
          otherCharges: chargeDetails,
          totalOtherCharges,
          pricingModel: 'PER_KG',
          cost: totalShippingCharge,
          eligible: true,
          errorMessage: null,
          method: `International ${formattedFreight}`,
          formula: `${parsedWeight} KG × ₹${perKgRate}/KG + ₹${totalOtherCharges} Other Charges`,
          breakdown: {
            baseFreight,
            perKgRate,
            tat,
            totalOtherCharges,
            otherCharges: chargeDetails,
          },
        });
      }

      return NextResponse.json({
        success: true,
        serviceType: 'International',
        freightType,
        destinationCountry,
        weight: parsedWeight,
        results,
      });
    }

    // Local Helper to parse weights in KG
    const getSlabWeightInKg = (s: any) => {
      return s.unit.toUpperCase() === 'GRAMS' ? s.weight / 1000 : s.weight;
    };

    for (const card of activeCards) {
      const companyName = companyMap.get(card.courierCompanyId || '') || 'Unknown Courier';

      // Entitlement guard for system cards
      if (card.ownerType === 'SYSTEM' && activeSub && !activeSub.systemRateCardAccess) {
        continue;
      }

      // Minimum Weight validation
      if (parsedWeight < card.minimumWeight) {
        results.push({
          id: card.id,
          name: card.rateCardName,
          courier: companyName,
          service: card.serviceName,
          serviceType: card.serviceType,
          pricingModel: card.pricingModel,
          version: card.version,
          cost: null,
          eligible: false,
          errorMessage: `${card.rateCardName} is not applicable for weights below ${card.minimumWeight} KG.`,
          method: 'Unavailable',
          formula: 'None',
          breakdown: {},
        });
        continue;
      }

      // Dynamic Compatibility mapper
      let slabsArray = (card.slabs as any[]) || [];
      let regionsArray = (card.regions as any[]) || [];

      const isOldFormat = slabsArray.length > 0 && ('destination' in slabsArray[0] || 'base250g' in slabsArray[0]);
      if (isOldFormat) {
        if (card.pricingModel === 'PER_KG') {
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

      // Determine candidate region names in priority order
      const candidateNames: string[] = [];
      const originInfo = classification.origin;
      const destInfo = classification.destination;

      const isSameCity = originInfo.city.toLowerCase() === destInfo.city.toLowerCase() || originInfo.pincode.substring(0, 3) === destInfo.pincode.substring(0, 3);
      const isSameState = originInfo.state.toLowerCase() === destInfo.state.toLowerCase() || originInfo.pincode.substring(0, 2) === destInfo.pincode.substring(0, 2);
      const isSameZone = originInfo.zone.toLowerCase() === destInfo.zone.toLowerCase() || originInfo.pincode.substring(0, 1) === destInfo.pincode.substring(0, 1);

      if (isSameCity) {
        candidateNames.push('within city', 'local');
      }
      if (isSameState) {
        candidateNames.push('within state', 'regional');
      }
      if (isSameZone) {
        candidateNames.push('within zone', 'zonal');
      }
      if (destInfo.isMetro) {
        candidateNames.push('metro');
      }
      // Add direct commercial region & zone
      candidateNames.push(destInfo.geoRegion.toLowerCase());
      candidateNames.push(destInfo.zone.toLowerCase());
      candidateNames.push('roi', 'rest of india');

      // Find region pricing rows
      let matchedRegion = null;
      for (const name of candidateNames) {
        matchedRegion = (regionsArray as any[]).find(r => r.name.toLowerCase() === name);
        if (matchedRegion) break;
      }

      if (!matchedRegion) {
        results.push({
          id: card.id,
          name: card.rateCardName,
          courier: companyName,
          service: card.serviceName,
          serviceType: card.serviceType,
          pricingModel: card.pricingModel,
          version: card.version,
          cost: null,
          eligible: false,
          errorMessage: `No pricing configured for destination region "${region}".`,
          method: 'Unavailable',
          formula: 'None',
          breakdown: {},
        });
        continue;
      }

      let calculatedCost = 0;
      let method = 'Weight Slab';
      let formula = '';
      let breakdown: any = {};

      const pricingWeight = parsedWeight;

      if (card.pricingModel === 'LTL_PTL') {
        method = 'LTL/PTL';
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
          formula = `${pricingWeight} KG × ₹${matchedRange.rate}/KG (${matchedRange.fromWeight}–${matchedRange.toWeight} ${matchedRange.unit})`;
          breakdown = {
            rate: matchedRange.rate,
            pricingWeight: pricingWeight,
            weightRange: `${matchedRange.fromWeight}–${matchedRange.toWeight} ${matchedRange.unit}`,
            range: matchedRange
          };
        } else {
          results.push({
            id: card.id,
            name: card.rateCardName,
            courier: companyName,
            service: card.serviceName,
            serviceType: card.serviceType,
            pricingModel: card.pricingModel,
            version: card.version,
            cost: null,
            eligible: false,
            errorMessage: `No matching LTL/PTL range for weight ${pricingWeight} KG.`,
            method: 'Unavailable',
            formula: 'None',
            breakdown: {},
          });
          continue;
        }
      } else if (card.pricingModel === 'PER_KG') {
        method = 'Cargo';
        const mode = serviceMode === 'Air' ? 'Air' : 'Surface';
        const rate = mode === 'Air' ? ((matchedRegion as any).airRatePerKg || (matchedRegion as any).perKg || 0) : ((matchedRegion as any).surfaceRatePerKg || (matchedRegion as any).perKg || 0);
        calculatedCost = pricingWeight * rate;
        formula = `${pricingWeight.toFixed(2)} KG × ₹${rate}/KG (${mode})`;
        breakdown = { mode, rate, pricingWeight };
      } else {
        // SLAB PRICING
        const threshold = card.cargoThreshold || 5.0;
        const cargoRate = parseFloat((matchedRegion as any).cargoRate as any) || 0;

        if (pricingWeight > threshold) {
          if (cargoRate > 0) {
            method = 'Cargo';
            calculatedCost = pricingWeight * cargoRate;
            formula = `${pricingWeight.toFixed(2)} KG × ₹${cargoRate}/KG (Cargo Threshold Exceeded)`;
            breakdown = { mode: 'Cargo', rate: cargoRate, pricingWeight };
          } else {
            results.push({
              id: card.id,
              name: card.rateCardName,
              courier: companyName,
              service: card.serviceName,
              serviceType: card.serviceType,
              pricingModel: card.pricingModel,
              version: card.version,
              cost: null,
              eligible: false,
              errorMessage: `${card.rateCardName} unavailable above ${threshold} KG — cargo pricing not configured.`,
              method: 'Unavailable',
              formula: 'None',
              breakdown: {},
            });
            continue;
          }
        } else {
          method = 'Weight Slab';
          // Sort base slabs and additional slabs dynamically
          const baseSlabs = (slabsArray as any[]).filter(s => s.type === 'BASE').sort((a, b) => getSlabWeightInKg(a) - getSlabWeightInKg(b));
          const addSlabs = (slabsArray as any[]).filter(s => s.type === 'ADDITIONAL').sort((a, b) => getSlabWeightInKg(a) - getSlabWeightInKg(b));
          
          const priceMap = new Map((matchedRegion as any).prices.map((p: any) => [p.slabId, parseFloat(p.amount) || 0]));

          // Find if there is a matching base slab
          let baseSlabUsed = null;
          for (const s of baseSlabs) {
            if (pricingWeight <= getSlabWeightInKg(s)) {
              baseSlabUsed = s;
              break;
            }
          }

          if (baseSlabUsed) {
            calculatedCost = Number(priceMap.get(baseSlabUsed.id)) || 0;
            formula = `Weight <= ${getSlabWeightInKg(baseSlabUsed)} KG. ${(baseSlabUsed as any).label} rate applied.`;
            breakdown = { baseRate: calculatedCost };
          } else {
            // Exceeds base slabs limit, apply additional calculations
            const largestBaseSlab = baseSlabs[baseSlabs.length - 1];
            const baseLimit = largestBaseSlab ? getSlabWeightInKg(largestBaseSlab) : 0.0;
            const baseCost = largestBaseSlab ? (Number(priceMap.get(largestBaseSlab.id)) || 0) : 0;

            const remainingWeight = pricingWeight - baseLimit;
            const addSlab = addSlabs[0];
            const addLimit = addSlab ? getSlabWeightInKg(addSlab) : 0.5;
            const addRate = addSlab ? (Number(priceMap.get(addSlab.id)) || 0) : 0;

            const extraSlabsCount = Math.ceil(remainingWeight / addLimit);
            calculatedCost = baseCost + extraSlabsCount * addRate;
            formula = `Base ${largestBaseSlab ? (largestBaseSlab as any).label : '0.0'} Limit (₹${baseCost}) + ${extraSlabsCount} additional slabs × ₹${addRate}/slab`;
            breakdown = { baseRate: baseCost, extraSlabs: extraSlabsCount, extraRate: addRate };
          }
        }
      }

      const roundedCost = parseFloat((calculatedCost as number).toFixed(2));

      results.push({
        id: card.id,
        name: card.rateCardName,
        courier: companyName,
        service: card.serviceName,
        serviceType: card.serviceType,
        pricingModel: card.pricingModel,
        version: card.version,
        cost: roundedCost,
        eligible: true,
        method,
        formula,
        breakdown,
      });
    }

    // 8. Save Calculation in History
    const savedCalculations = await prisma.calculation.create({
      data: {
        userId: user.id,
        unit: 'KG',
        divisor: 5000,
        packageCount: 1,
        actualWeight: parsedWeight,
        volumetricWeight: 0,
        chargeableWeight: parsedWeight,
        packages: [
          {
            originPincode,
            destinationPincode,
            region,
            serviceMode: serviceMode || 'Default',
            serviceType: serviceType || 'Domestic',
          },
        ],
        shippingCost: (() => {
          const validCosts = results.filter(r => r.cost !== null).map(r => r.cost as number);
          return validCosts.length > 0 ? Math.min(...validCosts) : null;
        })(),
        rateCardName: 'Rate Card Comparison Tool',
        destination: region,
      },
    });

    // 9. Enforce history capacity (20 records)
    const excessRecords = await prisma.calculation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      select: { id: true },
    });

    if (excessRecords.length > 0) {
      const idsToDelete = excessRecords.map(h => h.id);
      await prisma.calculation.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    // 10. Increment Demo counter if applicable (atomic check-and-increment)
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
    }

    return NextResponse.json({
      success: true,
      region,
      routeSummary: classification.routeSummary,
      origin: classification.origin,
      destination: classification.destination,
      results,
      calculationId: savedCalculations.id,
    });
  } catch (error: any) {
    console.error('Rate comparison error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
