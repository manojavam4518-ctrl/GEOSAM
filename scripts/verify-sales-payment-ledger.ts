import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  PLATFORM_MODULES,
  ensurePlatformModulesAndRolesSeeded,
} from '../src/lib/modulePermissions';
import {
  getOrganizationSalesPaymentLedgerConfig,
  validateSalesPaymentEntryData,
  calculateSalesPaymentLedgerTotals,
  extractSalesPaymentRowValue,
  REFERENCE_SALES_PAYMENT_FIELDS,
  SalesPaymentFieldConfig,
  SALES_PAYMENT_LEDGER_MODULE_KEY,
} from '../src/lib/salesPaymentLedger';

async function runSalesPaymentLedgerVerification() {
  console.log('================================================================');
  console.log('SALES PAYMENT COLLECTION LEDGER — COMPLETE VERIFICATION TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Module Catalog Integration
    console.log('--- 1. Testing Module Registration in Platform Catalogue ---');
    assert(
      PLATFORM_MODULES[SALES_PAYMENT_LEDGER_MODULE_KEY] !== undefined,
      `SALES_PAYMENT_COLLECTION_LEDGER exists in PLATFORM_MODULES`
    );

    const modDef = PLATFORM_MODULES[SALES_PAYMENT_LEDGER_MODULE_KEY];
    assert(
      modDef.name === 'Sales Payment Collection Ledger' && modDef.category === 'ORGANIZATION',
      'Module name is "Sales Payment Collection Ledger" under category ORGANIZATION'
    );
    assert(
      modDef.routes.includes('/dashboard/sales-payment-ledger'),
      'Module maps to route "/dashboard/sales-payment-ledger"'
    );

    await ensurePlatformModulesAndRolesSeeded();
    const dbModule = await (prisma as any).platformModule.findUnique({
      where: { key: SALES_PAYMENT_LEDGER_MODULE_KEY },
    });
    assert(Boolean(dbModule && dbModule.active), 'PlatformModule successfully seeded in database and active');

    // 2. Reference Default Fields (7 Exact Columns from Google Sheets)
    console.log('\n--- 2. Testing Initial Reference Fields (7 Exact Columns) ---');
    assert(
      REFERENCE_SALES_PAYMENT_FIELDS.length === 7,
      'Exact 7 initial reference fields defined'
    );

    const f1 = REFERENCE_SALES_PAYMENT_FIELDS[0];
    assert(
      f1.key === 'invoice_month' && f1.name === 'Invoice Month' && f1.type === 'MONTH' && f1.required === true,
      'Field 1: "Invoice Month" (key: invoice_month, type: MONTH, required: YES)'
    );

    const f2 = REFERENCE_SALES_PAYMENT_FIELDS[1];
    assert(
      f2.key === 'customer_type' &&
        f2.name === 'Customer Type' &&
        f2.type === 'DROPDOWN' &&
        f2.required === true &&
        f2.options?.length === 2 &&
        f2.options[0] === 'CREDIT CUSTOMER' &&
        f2.options[1] === 'CASH CUSTOMER',
      'Field 2: "Customer Type" (key: customer_type, type: DROPDOWN, required: YES, exact options: CREDIT CUSTOMER, CASH CUSTOMER)'
    );

    const f3 = REFERENCE_SALES_PAYMENT_FIELDS[2];
    assert(
      f3.key === 'customer_name' && f3.name === 'Customer Name' && f3.type === 'SHORT_TEXT' && f3.required === true,
      'Field 3: "Customer Name" (key: customer_name, type: SHORT_TEXT, required: YES)'
    );

    const f4 = REFERENCE_SALES_PAYMENT_FIELDS[3];
    assert(
      f4.key === 'invoice_number' && f4.name === 'Invoice Number' && f4.type === 'SHORT_TEXT' && f4.required === true,
      'Field 4: "Invoice Number" (key: invoice_number, type: SHORT_TEXT, required: YES)'
    );

    const f5 = REFERENCE_SALES_PAYMENT_FIELDS[4];
    assert(
      f5.key === 'total_invoice_amount' &&
        f5.name === 'Total Invoice Amount' &&
        f5.type === 'CURRENCY' &&
        f5.required === true &&
        f5.includeInTotal === true,
      'Field 5: "Total Invoice Amount" (key: total_invoice_amount, type: CURRENCY, required: YES, includeInTotal: YES)'
    );

    const f6 = REFERENCE_SALES_PAYMENT_FIELDS[5];
    const expectedModes = [
      'CHEQUE', 'NEFT/IMPS', 'DIGITAL PAYMENTS', 'DTDC WALLET',
      'CASH', 'PARTIAL PAYMENT', 'ADJUSTMENT', 'CONSOLIDATED',
    ];
    assert(
      f6.key === 'payment_received_mode' &&
        f6.type === 'DROPDOWN' &&
        f6.required === false &&
        f6.options?.length === 8 &&
        JSON.stringify(f6.options) === JSON.stringify(expectedModes),
      'Field 6: "Payment Received Mode" (key: payment_received_mode, type: DROPDOWN, exact 8 options)'
    );

    const f7 = REFERENCE_SALES_PAYMENT_FIELDS[6];
    const expectedStatuses = ['CREDITED', 'CHEQUE BOUNCE', 'PENDING'];
    assert(
      f7.key === 'cheque_clearance_status' &&
        f7.type === 'DROPDOWN' &&
        f7.required === false &&
        f7.options?.length === 3 &&
        JSON.stringify(f7.options) === JSON.stringify(expectedStatuses),
      'Field 7: "Cheque Clearance Status" (key: cheque_clearance_status, type: DROPDOWN, exact 3 options)'
    );

    // 3. Setup Test Organizations & Users
    console.log('\n--- 3. Setting Up Test Organizations (Org Alpha & Org Beta) ---');
    const timestamp = Date.now();
    const hashedPassword = await bcrypt.hash('Test@123456', 10);

    const orgAlpha = await prisma.organization.create({
      data: {
        name: `Org Alpha ${timestamp}`,
        ownerId: '000000000000000000000001',
        status: 'ACTIVE',
      },
    });

    const orgBeta = await prisma.organization.create({
      data: {
        name: `Org Beta ${timestamp}`,
        ownerId: '000000000000000000000002',
        status: 'ACTIVE',
      },
    });

    const adminAlpha = await prisma.user.create({
      data: {
        name: `Alpha Org Admin`,
        email: `alpha_spl_admin_${timestamp}@example.com`,
        mobile: '9876543210',
        company: orgAlpha.name,
        password: hashedPassword,
        role: 'ORG_ADMIN',
        organizationId: orgAlpha.id,
        status: 'ACTIVE',
      },
    });

    const userAlpha = await prisma.user.create({
      data: {
        name: `Alpha Employee`,
        email: `alpha_spl_user_${timestamp}@example.com`,
        mobile: '9876543211',
        company: orgAlpha.name,
        password: hashedPassword,
        role: 'USER',
        organizationId: orgAlpha.id,
        status: 'ACTIVE',
      },
    });

    assert(Boolean(orgAlpha.id && orgBeta.id), 'Successfully initialized Org Alpha and Org Beta');

    // 4. Organization Admin Alpha Configures Custom Columns
    console.log('\n--- 4. Testing Organization Admin Column Configuration for Org Alpha ---');
    const customCol: SalesPaymentFieldConfig = {
      id: `spf_collection_exec_${timestamp}`,
      key: 'collection_executive',
      name: 'Collection Executive',
      type: 'SHORT_TEXT',
      required: true,
      defaultValue: '',
      order: 7,
      active: true,
      width: 180,
    };

    const customTaxCol: SalesPaymentFieldConfig = {
      id: `spf_tax_deducted_${timestamp}`,
      key: 'tax_deducted',
      name: 'Tax Deducted (TDS)',
      type: 'CURRENCY',
      required: false,
      defaultValue: 0,
      currencySymbol: '₹',
      decimalPlaces: 2,
      includeInTotal: true,
      order: 8,
      active: true,
      width: 160,
    };

    const alphaColumns = [...REFERENCE_SALES_PAYMENT_FIELDS, customCol, customTaxCol];

    await (prisma as any).salesPaymentLedgerConfig.create({
      data: {
        organizationId: orgAlpha.id,
        columns: alphaColumns,
      },
    });

    const loadedAlphaConfig = await getOrganizationSalesPaymentLedgerConfig(orgAlpha.id);
    assert(
      loadedAlphaConfig.columns.length === 9,
      'Org Alpha successfully saved 9 configured columns (7 reference + 2 custom)'
    );
    assert(
      loadedAlphaConfig.columns.some((c: any) => c.key === 'collection_executive'),
      'Custom column "Collection Executive" present in Org Alpha'
    );
    assert(
      loadedAlphaConfig.columns.some((c: any) => c.key === 'tax_deducted' && c.includeInTotal === true),
      'Custom currency column "Tax Deducted (TDS)" configured with includeInTotal: true'
    );

    // 5. Multi-Tenant Organization Isolation: Org Beta has untouched default columns
    console.log('\n--- 5. Testing Multi-Tenant Organization Isolation ---');
    const loadedBetaConfig = await getOrganizationSalesPaymentLedgerConfig(orgBeta.id);
    assert(
      loadedBetaConfig.columns.length === 7,
      'Org Beta maintains independent default reference columns (7 columns)'
    );
    assert(
      !loadedBetaConfig.columns.some((c: any) => c.key === 'collection_executive'),
      'Org Beta does NOT have Org Alpha\'s "Collection Executive" column'
    );
    assert(
      !loadedBetaConfig.columns.some((c: any) => c.key === 'tax_deducted'),
      'Org Beta does NOT have Org Alpha\'s "Tax Deducted" column'
    );

    // 6. Validation of Required Fields
    console.log('\n--- 6. Testing Frontend/Backend Validation for Required Fields ---');
    const incompleteRow = {
      invoice_month: 'APRIL_2026',
      customer_type: 'CREDIT CUSTOMER',
      // missing customer_name, invoice_number, total_invoice_amount, collection_executive
    };
    const invalidVal = validateSalesPaymentEntryData(incompleteRow, loadedAlphaConfig.fields);
    assert(!invalidVal.valid, 'Validation correctly rejects incomplete row missing required fields');

    const validRow = {
      invoice_month: 'APRIL_2026',
      customer_type: 'CREDIT CUSTOMER',
      customer_name: 'INHAWK IT SOLUTIONS PVT LTD',
      invoice_number: 'GIN2600016',
      total_invoice_amount: 7425.74,
      payment_received_mode: 'CHEQUE',
      cheque_clearance_status: 'CREDITED',
      collection_executive: 'Ramesh Kumar',
      tax_deducted: 150.00,
    };
    const validVal = validateSalesPaymentEntryData(validRow, loadedAlphaConfig.fields);
    assert(validVal.valid, 'Validation accepts complete valid row meeting all required constraints');

    // 7. Data Entry into SalesPaymentLedgerEntry
    console.log('\n--- 7. Testing Spreadsheet Data Entry for Org Alpha ---');
    const createdAlphaRow = await (prisma as any).salesPaymentLedgerEntry.create({
      data: {
        organizationId: orgAlpha.id,
        createdById: userAlpha.id,
        createdByName: userAlpha.name,
        date: new Date('2026-04-10'),
        invoiceMonth: validRow.invoice_month,
        customerType: validRow.customer_type,
        customerName: validRow.customer_name,
        invoiceNumber: validRow.invoice_number,
        totalInvoiceAmount: validRow.total_invoice_amount,
        paymentReceivedMode: validRow.payment_received_mode,
        chequeClearanceStatus: validRow.cheque_clearance_status,
        data: validRow,
      },
    });
    assert(Boolean(createdAlphaRow.id), 'Successfully inserted row into SalesPaymentLedgerEntry for Org Alpha');

    // 8. Test Formula Totals
    console.log('\n--- 8. Testing Formula Totals & Mode Breakdowns ---');
    const alphaEntries = await (prisma as any).salesPaymentLedgerEntry.findMany({
      where: { organizationId: orgAlpha.id },
    });
    const summary = calculateSalesPaymentLedgerTotals(alphaEntries, loadedAlphaConfig.fields);
    assert(summary.recordCount === 1, 'Summary record count equals 1');
    assert(summary.totalInvoiceAmount === 7425.74, 'SUM (Total Invoice Amount) equals ₹7,425.74');
    assert(summary.columnTotals['tax_deducted'] === 150, 'Custom column "tax_deducted" correctly aggregated (₹150.00)');
    assert(summary.modeTotals['CHEQUE'] === 7425.74, 'Payment mode CHEQUE correctly aggregated (₹7,425.74)');

    // 9. Separation from Counter Cash Ledger
    console.log('\n--- 9. Testing Absolute Separation from Counter Cash Ledger ---');
    const cashLedgerCount = await (prisma as any).cashLedgerEntry.count({
      where: { organizationId: orgAlpha.id },
    });
    assert(cashLedgerCount === 0, 'Counter Cash Ledger remains completely untouched and has 0 rows');

    // 10. Test Organization Reset to Reference Defaults
    console.log('\n--- 10. Testing Organization Reset to Reference Defaults ---');
    await (prisma as any).salesPaymentLedgerConfig.update({
      where: { organizationId: orgAlpha.id },
      data: { columns: REFERENCE_SALES_PAYMENT_FIELDS },
    });
    const resetConfig = await getOrganizationSalesPaymentLedgerConfig(orgAlpha.id);
    assert(resetConfig.columns.length === 7, 'Org Alpha successfully reset to exact 7 reference columns');

    // Clean up
    console.log('\n--- Cleaning Up Test Data ---');
    await (prisma as any).salesPaymentLedgerEntry.deleteMany({
      where: { id: createdAlphaRow.id },
    });
    await (prisma as any).salesPaymentLedgerConfig.deleteMany({
      where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminAlpha.id, userAlpha.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAlpha.id, orgBeta.id] } },
    });

    console.log('\n================================================================');
    console.log(`SALES PAYMENT LEDGER VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

runSalesPaymentLedgerVerification();
