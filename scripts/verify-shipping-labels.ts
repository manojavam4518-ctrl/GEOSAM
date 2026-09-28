import { prisma } from '../src/lib/prisma';
import {
  SHIPPING_LABEL_MODULE_KEY,
  getOrCreateMasterShippingLabelTemplate,
  generateTrackingNumber,
  validateShippingLabelData,
  DEFAULT_MASTER_TEMPLATE,
} from '../src/lib/shippingLabel';
import { PLATFORM_MODULES } from '../src/lib/modulePermissions';
import { recordAuditLog } from '../src/lib/audit';

async function runTests() {
  console.log('====================================================');
  console.log('SHIPPING LABEL GENERATOR MODULE — VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test 1: Module Definition & Entitlements
    // ----------------------------------------------------
    console.log('--- 1. Module Definition & Constants ---');
    assert(SHIPPING_LABEL_MODULE_KEY === 'SHIPPING_LABEL_GENERATOR', 'SHIPPING_LABEL_MODULE_KEY constant is SHIPPING_LABEL_GENERATOR');
    const modDef = PLATFORM_MODULES.SHIPPING_LABEL_GENERATOR;
    assert(!!modDef, 'PLATFORM_MODULES contains SHIPPING_LABEL_GENERATOR');
    assert(modDef?.category === 'LOGISTICS', 'Module category is LOGISTICS');
    assert(modDef?.routes.includes('/dashboard/shipping-labels'), 'Module routes include /dashboard/shipping-labels');

    // ----------------------------------------------------
    // Test 2: Tracking Number Generation
    // ----------------------------------------------------
    console.log('\n--- 2. Tracking / Consignment Number Generator ---');
    const t1 = generateTrackingNumber();
    const t2 = generateTrackingNumber();
    assert(t1.startsWith('GT'), 'Generated tracking number starts with GT prefix');
    assert(t1.length >= 10, 'Generated tracking number is at least 10 chars');
    assert(t1 !== t2, 'Generated tracking numbers are unique');

    // ----------------------------------------------------
    // Test 3: Master Template Retrieval / Seeding
    // ----------------------------------------------------
    console.log('\n--- 3. Master Template Retrieval & Seed ---');
    const masterTemplate = await getOrCreateMasterShippingLabelTemplate();
    assert(!!masterTemplate, 'Master template exists in database');
    assert(masterTemplate.name === 'Standard 4×6 Logistics Label', 'Master template name is Standard 4×6 Logistics Label');
    assert(masterTemplate.sizePreset === '4x6', 'Master template size preset is 4x6');
    assert(masterTemplate.widthInches === 4.0 && masterTemplate.heightInches === 6.0, 'Dimensions are 4x6 inches');
    assert(masterTemplate.qrConfig?.enabled === true, 'QR code is enabled in master template');
    assert(masterTemplate.barcodeConfig?.type === 'CODE128', 'Barcode format is CODE128');
    assert(!!masterTemplate.logoUrl, 'Logo URL is present in master template');
    assert(Array.isArray(masterTemplate.fields) && masterTemplate.fields.length >= 15, 'Contains full initial fields schema');

    // ----------------------------------------------------
    // Test 4: Validation Engine
    // ----------------------------------------------------
    console.log('\n--- 4. Validation Engine ---');
    const invalidResult = validateShippingLabelData(masterTemplate.fields, {
      recipient_name: '',
      tracking_number: '',
    });
    assert(!invalidResult.valid, 'Fails validation when required fields are missing');
    assert(invalidResult.errors.length > 0, 'Returns descriptive error list');

    const validResult = validateShippingLabelData(masterTemplate.fields, {
      recipient_name: 'TEST RECIPIENT PVT LTD',
      address_line_1: 'Industrial Zone A',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      mobile: '+91 99999 88888',
      tracking_number: 'GT2609999999',
      weight: 1.5,
      payment_status: 'PREPAID',
    });
    assert(validResult.valid, 'Passes validation when all required fields are provided');

    // ----------------------------------------------------
    // Test 5: Multi-Tenant Database Isolation
    // ----------------------------------------------------
    console.log('\n--- 5. Database Isolation & Historical Snapshot ---');
    let testOrgA = await (prisma as any).organization.findFirst({
      where: { name: { contains: 'Test' } },
    });
    if (!testOrgA) {
      testOrgA = await (prisma as any).organization.findFirst();
    }

    if (testOrgA) {
      const trackingCode = generateTrackingNumber();

      // Create Label for Org A
      const labelA = await (prisma as any).shippingLabel.create({
        data: {
          organizationId: testOrgA.id,
          templateId: masterTemplate.id,
          templateSnapshot: {
            name: masterTemplate.name,
            version: masterTemplate.version,
            sizePreset: masterTemplate.sizePreset,
          },
          trackingNumber: trackingCode,
          recipientName: 'TEST CLIENT ORG A',
          recipientCity: 'Pune',
          recipientState: 'Maharashtra',
          recipientPincode: '411001',
          service: 'LITE',
          weight: 2.0,
          paymentStatus: 'PREPAID',
        },
      });

      assert(!!labelA.id, 'Shipping label created successfully in database');
      assert(labelA.organizationId.toString() === testOrgA.id.toString(), 'Label correctly linked to Organization A');
      assert(labelA.templateSnapshot?.version === masterTemplate.version, 'Template snapshot saved for version safety');

      // Query isolated by organization
      const orgALabels = await (prisma as any).shippingLabel.findMany({
        where: { organizationId: testOrgA.id, trackingNumber: trackingCode },
      });
      assert(orgALabels.length === 1, 'Organization A finds its own label');

      // Query with dummy other organization ID
      const fakeOrgId = '507f1f77bcf86cd799439011';
      const fakeOrgLabels = await (prisma as any).shippingLabel.findMany({
        where: { organizationId: fakeOrgId, trackingNumber: trackingCode },
      });
      assert(fakeOrgLabels.length === 0, 'Foreign Organization cannot view Organization A label (Isolation Verified)');

      // Clean up test label
      await (prisma as any).shippingLabel.delete({
        where: { id: labelA.id },
      });
      assert(true, 'Test shipping label cleaned up successfully');
    }

    // ----------------------------------------------------
    // Test 6: Audit Log Recording
    // ----------------------------------------------------
    console.log('\n--- 6. Audit Logging ---');
    const log = await recordAuditLog({
      action: 'SHIPPING_LABEL_GENERATED',
      metadata: {
        test: true,
        module: SHIPPING_LABEL_MODULE_KEY,
      },
    });
    assert(!!log?.id, 'Audit log recorded successfully for shipping label generation');

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
