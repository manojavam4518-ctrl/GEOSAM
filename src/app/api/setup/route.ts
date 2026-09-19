import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { DEFAULT_TEMPLATES } from '@/lib/email';

export async function GET() {
  try {
    // Check if any admin exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    return NextResponse.json({
      setupAvailable: adminCount === 0,
    });
  } catch (error: any) {
    console.error('Setup check error:', error);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check if admin already exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return NextResponse.json({ error: 'Setup already completed. This route is disabled.' }, { status: 403 });
    }

    const { name, email, mobile, company, password } = await req.json();

    if (!name || !email || !mobile || !company || !password) {
      return NextResponse.json({ error: 'All fields are required to create the administrator.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // 2. Hash admin password
    const hashedPassword = await hashPassword(password);

    // 3. Create Admin User
    const admin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        mobile,
        company,
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true, // Auto-verified
      },
    });

    // 4. Seed 5 Subscription Plans (with default prices set to 0.0 or standard placeholders, which Admin will configure)
    const plansToSeed = [
      { name: '2 Devices Plan', deviceLimit: 2, customRateCardLimit: 3, systemRateCardAccess: true, rateComparisonEnabled: false, rateCardImportEnabled: false, rateCardExportEnabled: false, recommended: false, price3Months: 499, price6Months: 899, price12Months: 1499 },
      { name: '3 Devices Plan', deviceLimit: 3, customRateCardLimit: 5, systemRateCardAccess: true, rateComparisonEnabled: false, rateCardImportEnabled: false, rateCardExportEnabled: false, recommended: false, price3Months: 799, price6Months: 1299, price12Months: 2299 },
      { name: '5 Devices Plan', deviceLimit: 5, customRateCardLimit: 10, systemRateCardAccess: true, rateComparisonEnabled: true, rateCardImportEnabled: true, rateCardExportEnabled: false, recommended: true, price3Months: 1199, price6Months: 1999, price12Months: 3499 }, // Recommended
      { name: '10 Devices Plan', deviceLimit: 10, customRateCardLimit: 25, systemRateCardAccess: true, rateComparisonEnabled: true, rateCardImportEnabled: true, rateCardExportEnabled: true, recommended: false, price3Months: 1999, price6Months: 3499, price12Months: 5999 },
      { name: '20 Devices Plan', deviceLimit: 20, customRateCardLimit: 100, systemRateCardAccess: true, rateComparisonEnabled: true, rateCardImportEnabled: true, rateCardExportEnabled: true, recommended: false, price3Months: 3499, price6Months: 5999, price12Months: 9999 },
    ];

    for (const plan of plansToSeed) {
      await prisma.subscriptionPlan.upsert({
        where: { name: plan.name },
        update: {
          customRateCardLimit: plan.customRateCardLimit,
          systemRateCardAccess: plan.systemRateCardAccess,
          rateComparisonEnabled: plan.rateComparisonEnabled,
          rateCardImportEnabled: plan.rateCardImportEnabled,
          rateCardExportEnabled: plan.rateCardExportEnabled,
        },
        create: {
          name: plan.name,
          deviceLimit: plan.deviceLimit,
          customRateCardLimit: plan.customRateCardLimit,
          systemRateCardAccess: plan.systemRateCardAccess,
          rateComparisonEnabled: plan.rateComparisonEnabled,
          rateCardImportEnabled: plan.rateCardImportEnabled,
          rateCardExportEnabled: plan.rateCardExportEnabled,
          recommended: plan.recommended,
          price3Months: plan.price3Months,
          price6Months: plan.price6Months,
          price12Months: plan.price12Months,
          active: true,
        },
      });
    }

    // 4.5. Seed Default System Rate Cards
    const systemRateCardsCount = await prisma.rateCard.count({ where: { ownerType: 'SYSTEM' } });
    if (systemRateCardsCount === 0) {
      let dtdcCompany = await prisma.courierCompany.findFirst({
        where: { name: 'DTDC', userId: null }
      });
      if (!dtdcCompany) {
        dtdcCompany = await prisma.courierCompany.create({
          data: {
            name: 'DTDC',
            trackingUrl: 'https://www.dtdc.in/tracking',
            pincodeServiceabilityUrl: 'https://www.dtdc.in/pincode',
            active: true,
          }
        });
      }

      const dtdcStandardSlabs = [
        { id: 'slab250', type: 'BASE', weight: 250, unit: 'GRAMS', label: 'Base 250G' },
        { id: 'slab500', type: 'BASE', weight: 500, unit: 'GRAMS', label: 'Base 500G' },
        { id: 'slabadd', type: 'ADDITIONAL', weight: 500, unit: 'GRAMS', label: 'Add 500G' }
      ];
      const dtdcStandardRegions = [
        { name: 'Within City', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 35 }, { slabId: 'slab500', amount: 45 }, { slabId: 'slabadd', amount: 27 }] },
        { name: 'Within State', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 60 }, { slabId: 'slab500', amount: 75 }, { slabId: 'slabadd', amount: 36 }] },
        { name: 'Within Zone', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 80 }, { slabId: 'slab500', amount: 100 }, { slabId: 'slabadd', amount: 55 }] },
        { name: 'Metro', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 100 }, { slabId: 'slab500', amount: 120 }, { slabId: 'slabadd', amount: 75 }] },
        { name: 'ROI', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 120 }, { slabId: 'slab500', amount: 140 }, { slabId: 'slabadd', amount: 90 }] },
        { name: 'Special Destination', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 160 }, { slabId: 'slab500', amount: 170 }, { slabId: 'slabadd', amount: 130 }] }
      ];

      const dtdcCargoSlabs = [
        { id: 'slabkg', type: 'BASE', weight: 1, unit: 'KG', label: 'Rate/KG' }
      ];
      const dtdcCargoRegions = [
        { name: 'Within City', cargoRate: 0, airRatePerKg: 15, surfaceRatePerKg: 10, prices: [{ slabId: 'slabkg', amount: 15 }] },
        { name: 'Within State', cargoRate: 0, airRatePerKg: 25, surfaceRatePerKg: 18, prices: [{ slabId: 'slabkg', amount: 25 }] },
        { name: 'Within Zone', cargoRate: 0, airRatePerKg: 35, surfaceRatePerKg: 28, prices: [{ slabId: 'slabkg', amount: 35 }] },
        { name: 'Metro', cargoRate: 0, airRatePerKg: 45, surfaceRatePerKg: 35, prices: [{ slabId: 'slabkg', amount: 45 }] },
        { name: 'ROI', cargoRate: 0, airRatePerKg: 55, surfaceRatePerKg: 45, prices: [{ slabId: 'slabkg', amount: 55 }] }
      ];

      const dtdcPremiumSlabs = [
        { id: 'slab250', type: 'BASE', weight: 250, unit: 'GRAMS', label: 'Base 250G' },
        { id: 'slab500', type: 'BASE', weight: 500, unit: 'GRAMS', label: 'Base 500G' },
        { id: 'slabadd', type: 'ADDITIONAL', weight: 500, unit: 'GRAMS', label: 'Add 500G' }
      ];
      const dtdcPremiumRegions = [
        { name: 'Within City', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 65 }, { slabId: 'slab500', amount: 85 }, { slabId: 'slabadd', amount: 45 }] },
        { name: 'Within State', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 110 }, { slabId: 'slab500', amount: 130 }, { slabId: 'slabadd', amount: 65 }] },
        { name: 'Within Zone', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 140 }, { slabId: 'slab500', amount: 170 }, { slabId: 'slabadd', amount: 95 }] },
        { name: 'Metro', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 170 }, { slabId: 'slab500', amount: 200 }, { slabId: 'slabadd', amount: 120 }] },
        { name: 'ROI', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 200 }, { slabId: 'slab500', amount: 240 }, { slabId: 'slabadd', amount: 150 }] },
        { name: 'Special Destination', cargoRate: 0, prices: [{ slabId: 'slab250', amount: 250 }, { slabId: 'slab500', amount: 300 }, { slabId: 'slabadd', amount: 220 }] }
      ];

      await prisma.rateCard.createMany({
        data: [
          {
            ownerType: 'SYSTEM',
            courierCompanyId: dtdcCompany.id,
            rateCardName: 'DTDC Standard/Lite',
            serviceName: 'Lite',
            serviceType: 'Domestic',
            rateCardType: 'Courier',
            pricingModel: 'SLAB',
            minimumWeight: 0.0,
            cargoThreshold: 5.0,
            active: true,
            useForComparison: true,
            slabs: dtdcStandardSlabs,
            regions: dtdcStandardRegions,
          },
          {
            ownerType: 'SYSTEM',
            courierCompanyId: dtdcCompany.id,
            rateCardName: 'DTDC Cargo',
            serviceName: 'Cargo',
            serviceType: 'Domestic',
            rateCardType: 'Cargo',
            pricingModel: 'PER_KG',
            minimumWeight: 10.0,
            cargoThreshold: 5.0,
            active: true,
            useForComparison: true,
            slabs: dtdcCargoSlabs,
            regions: dtdcCargoRegions,
          },
          {
            ownerType: 'SYSTEM',
            courierCompanyId: dtdcCompany.id,
            rateCardName: 'DTDC Premium',
            serviceName: 'Premium',
            serviceType: 'Domestic',
            rateCardType: 'Premium Service',
            pricingModel: 'SLAB',
            minimumWeight: 0.0,
            cargoThreshold: 5.0,
            active: true,
            useForComparison: true,
            slabs: dtdcPremiumSlabs,
            regions: dtdcPremiumRegions,
          }
        ]
      });
    }

    // 5. Seed default Payment Settings
    const paymentSettingsCount = await prisma.paymentSettings.count();
    if (paymentSettingsCount === 0) {
      await prisma.paymentSettings.create({
        data: {
          upiId: 'pay@geotransit',
          upiName: 'GEO TRANSIT SOLUTIONS',
          bankAccountHolder: 'GEO TRANSIT PVT LTD',
          bankName: 'ICICI Bank',
          bankAccountNumber: '123405006789',
          bankIfsc: 'ICIC0001234',
          bankBranch: 'Mumbai East',
          bankAccountType: 'Current Account',
          gstEnabled: true,
          gstRate: 18.0,
          paymentInstructions: 'Please make payment using either UPI or Bank Transfer and upload the UTR/ screenshot.',
          upiInstructions: 'Scan QR code or use UPI ID. Enter total amount with GST.',
          bankInstructions: 'Transfer via NEFT/IMPS/RTGS. Mention company name in remarks.',
        },
      });
    }

    // 6. Seed default SMTPSettings if environment variables are provided
    const smtpSettingsCount = await prisma.sMTPSettings.count();
    if (smtpSettingsCount === 0 && process.env.SMTP_HOST && process.env.SMTP_USER) {
      await prisma.sMTPSettings.create({
        data: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
          username: process.env.SMTP_USER,
          password: process.env.SMTP_PASSWORD || '',
          encryption: process.env.SMTP_ENCRYPTION || 'TLS',
          fromName: process.env.SMTP_FROM_NAME || 'GEO TRANSIT Support',
          fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
        },
      });
    }

    // 7. Seed Email Templates
    for (const [name, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
      await prisma.emailTemplate.upsert({
        where: { name },
        update: {},
        create: {
          name,
          subject: tmpl.subject,
          body: tmpl.body,
        },
      });
    }

    // 8. Seed default Website settings
    const websiteSettingsCount = await prisma.websiteSettings.count();
    if (websiteSettingsCount === 0) {
      await prisma.websiteSettings.create({
        data: {
          heroHeadline: 'Calculate. Track. Manage. Ship Smarter.',
          heroSubtitle: 'GEO TRANSIT is an enterprise logistics utility platform designed to simplify volumetric calculations, pincode verification, and tracking.',
          supportEmail: 'support@geotransit.com',
          footerText: '© 2026 GEO TRANSIT. All rights reserved.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully. Admin account and initial seed database created.',
    });
  } catch (error: any) {
    console.error('Setup initialization error:', error);
    return NextResponse.json({ error: 'Setup execution failed: ' + error.message }, { status: 500 });
  }
}
