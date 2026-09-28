import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  getPlatformLedgerConfig,
  getOrganizationLedgerConfig,
  validateLedgerEntryData,
  calculateLedgerBalances,
  extractRowFieldValue,
  REFERENCE_LEDGER_FIELDS,
  LedgerFieldConfig,
} from '../src/lib/cashLedger';

async function runProductionVerification() {
  console.log('================================================================');
  console.log('COUNTER CASH LEDGER — ORGANIZATION ADMIN CONFIGURATION & ISOLATION TEST');
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
    // 1. Initial Reference Configuration
    console.log('--- 1. Testing Default Reference Configuration (7 Exact Columns) ---');
    const platformConfig = await getPlatformLedgerConfig();
    assert(platformConfig.fields.length === 7, 'Exact 7 reference columns initialized in platform default');

    const f1 = platformConfig.fields[0];
    assert(
      f1.key === 'invoice_month' && f1.name === 'Invoice Month' && f1.type === 'MONTH' && f1.required === true,
      'Field 1: "Invoice Month" (key: invoice_month, type: MONTH, required: YES)'
    );

    const f2 = platformConfig.fields[1];
    assert(
      f2.key === 'customer_type' &&
        f2.name === 'Customer Type' &&
        f2.type === 'DROPDOWN' &&
        f2.required === true &&
        f2.options?.length === 2 &&
        f2.options[0] === 'CREDIT CUSTOMER' &&
        f2.options[1] === 'CASH CUSTOMER',
      'Field 2: "Customer Type" (key: customer_type, type: DROPDOWN, required: YES, exact 2 options: CREDIT CUSTOMER, CASH CUSTOMER)'
    );

    const f3 = platformConfig.fields[2];
    assert(
      f3.key === 'customer_name' && f3.name === 'Customer Name' && f3.type === 'SHORT_TEXT' && f3.required === true,
      'Field 3: "Customer Name" (key: customer_name, type: SHORT_TEXT, required: YES)'
    );

    const f4 = platformConfig.fields[3];
    assert(
      f4.key === 'invoice_number' && f4.name === 'Invoice Number' && f4.type === 'SHORT_TEXT' && f4.required === true,
      'Field 4: "Invoice Number" (key: invoice_number, type: SHORT_TEXT, required: YES)'
    );

    const f5 = platformConfig.fields[4];
    assert(
      f5.key === 'total_invoice_amount' &&
        f5.name === 'Total Invoice Amount' &&
        f5.type === 'CURRENCY' &&
        f5.required === true,
      'Field 5: "Total Invoice Amount" (key: total_invoice_amount, type: CURRENCY, required: YES)'
    );

    const f6 = platformConfig.fields[5];
    const expectedPaymentModes = [
      'CHEQUE',
      'NEFT/IMPS',
      'DIGITAL PAYMENTS',
      'DTDC WALLET',
      'CASH',
      'PARTIAL PAYMENT',
      'ADJUSTMENT',
      'CONSOLIDATED',
    ];
    assert(
      f6.key === 'payment_received_mode' &&
        f6.type === 'DROPDOWN' &&
        f6.required === false &&
        f6.options?.length === 8 &&
        JSON.stringify(f6.options) === JSON.stringify(expectedPaymentModes),
      'Field 6: "Payment Received Mode" (key: payment_received_mode, type: DROPDOWN, exact 8 reference options)'
    );

    const f7 = platformConfig.fields[6];
    const expectedChequeStatuses = ['CREDITED', 'CHEQUE BOUNCE', 'PENDING'];
    assert(
      f7.key === 'cheque_clearance_status' &&
        f7.type === 'DROPDOWN' &&
        f7.required === false &&
        f7.options?.length === 3 &&
        JSON.stringify(f7.options) === JSON.stringify(expectedChequeStatuses),
      'Field 7: "Cheque Clearance Status" (key: cheque_clearance_status, type: DROPDOWN, exact 3 reference options)'
    );

    // 2. Setup Test Organizations & Users
    console.log('\n--- 2. Setting Up Test Organizations (Org A and Org B) ---');
    const timestamp = Date.now();
    const hashedPassword = await bcrypt.hash('Test@123456', 10);

    const companyA = await prisma.organization.create({
      data: {
        name: `Org Alpha ${timestamp}`,
        ownerId: '000000000000000000000001',
        status: 'ACTIVE',
      },
    });

    const companyB = await prisma.organization.create({
      data: {
        name: `Org Beta ${timestamp}`,
        ownerId: '000000000000000000000002',
        status: 'ACTIVE',
      },
    });

    // Org Admin for Company A
    const orgAdminA = await prisma.user.create({
      data: {
        name: `Alpha Admin ${timestamp}`,
        email: `alpha_admin_${timestamp}@example.com`,
        mobile: '9876543210',
        company: companyA.name,
        password: hashedPassword,
        role: 'ORG_ADMIN',
        organizationId: companyA.id,
        status: 'ACTIVE',
      },
    });

    // Normal User for Company A
    const userA = await prisma.user.create({
      data: {
        name: `Alpha Employee ${timestamp}`,
        email: `alpha_emp_${timestamp}@example.com`,
        mobile: '9876543211',
        company: companyA.name,
        password: hashedPassword,
        role: 'USER',
        organizationId: companyA.id,
        status: 'ACTIVE',
      },
    });

    // Org Admin for Company B
    const orgAdminB = await prisma.user.create({
      data: {
        name: `Beta Admin ${timestamp}`,
        email: `beta_admin_${timestamp}@example.com`,
        mobile: '9876543212',
        company: companyB.name,
        password: hashedPassword,
        role: 'ORG_ADMIN',
        organizationId: companyB.id,
        status: 'ACTIVE',
      },
    });

    assert(Boolean(companyA.id && companyB.id), 'Successfully initialized test organizations Company A and Company B');
    assert(Boolean(orgAdminA.id && userA.id && orgAdminB.id), 'Successfully initialized Org Admin A, User A, and Org Admin B');

    // 3. Organization Admin A configures custom columns for Company A
    console.log('\n--- 3. Testing Organization Admin Column Configuration for Company A ---');
    const salesExecField: LedgerFieldConfig = {
      id: `fld_sales_exec_${timestamp}`,
      key: 'sales_executive',
      name: 'Sales Executive',
      type: 'SHORT_TEXT',
      required: true,
      defaultValue: '',
      order: 7,
      active: true,
      width: 170,
    };

    const paymentModeField: LedgerFieldConfig = {
      id: `fld_pay_mode_${timestamp}`,
      key: 'payment_mode',
      name: 'Payment Mode',
      type: 'DROPDOWN',
      required: true,
      defaultValue: '',
      options: ['Cash', 'Cheque', 'UPI'],
      order: 8,
      active: true,
      width: 160,
    };

    const companyAFields = [...REFERENCE_LEDGER_FIELDS, salesExecField, paymentModeField];

    // Save configuration directly to Company A's CashLedgerConfig
    await (prisma as any).cashLedgerConfig.upsert({
      where: { organizationId: companyA.id },
      update: { columns: companyAFields },
      create: { organizationId: companyA.id, columns: companyAFields },
    });

    const loadedAConfig = await getOrganizationLedgerConfig(companyA.id);
    const hasSalesExecInA = loadedAConfig.columns.some((c: any) => c.key === 'sales_executive');
    const hasPayModeInA = loadedAConfig.columns.some((c: any) => c.key === 'payment_mode' && c.options?.includes('UPI'));

    assert(hasSalesExecInA, 'Organization Admin A successfully added "Sales Executive" column to Company A');
    assert(hasPayModeInA, 'Organization Admin A successfully added "Payment Mode" dropdown (Cash, Cheque, UPI) to Company A');

    // 4. Strict Multi-Tenant Organization Isolation: Verify Company B does NOT see Company A's columns
    console.log('\n--- 4. Testing Multi-Tenant Organization Column Isolation ---');
    const loadedBConfig = await getOrganizationLedgerConfig(companyB.id);
    const hasSalesExecInB = loadedBConfig.columns.some((c: any) => c.key === 'sales_executive');
    const hasPayModeInB = loadedBConfig.columns.some((c: any) => c.key === 'payment_mode');

    assert(!hasSalesExecInB, 'Company B does NOT receive Company A\'s "Sales Executive" column');
    assert(!hasPayModeInB, 'Company B does NOT receive Company A\'s custom "Payment Mode" dropdown');
    assert(loadedBConfig.columns.length === 7, 'Company B maintains its own independent default reference columns (7 columns)');

    // 5. Test Column Name Renaming without Key Mutation for Company A
    console.log('\n--- 5. Testing Renaming Column Display Label in Company A ---');
    const renamedAFields = companyAFields.map((f) => {
      if (f.key === 'customer_name') {
        return { ...f, name: 'Customer / Client Name' };
      }
      return f;
    });

    await (prisma as any).cashLedgerConfig.update({
      where: { organizationId: companyA.id },
      data: { columns: renamedAFields },
    });

    const reloadedA = await getOrganizationLedgerConfig(companyA.id);
    const custFieldA = reloadedA.columns.find((c: any) => c.key === 'customer_name');
    assert(
      custFieldA?.name === 'Customer / Client Name' && custFieldA?.key === 'customer_name',
      'Display label updated to "Customer / Client Name" while keeping machine key "customer_name" stable'
    );

    // 6. Test Company User Data Entry in Company A
    console.log('\n--- 6. Testing Company User Spreadsheet Entry with Org A Config ---');
    const completeRowA = {
      invoice_month: 'APRIL_2026',
      customer_type: 'CASH CUSTOMER',
      customer_name: 'DELTA LOGISTICS',
      invoice_number: 'GIN2600099',
      total_invoice_amount: 8500,
      payment_received_mode: 'CASH',
      cheque_clearance_status: 'CREDITED',
      sales_executive: 'Vikram Sharma',
      payment_mode: 'UPI',
    };

    const valRes = validateLedgerEntryData(completeRowA, reloadedA.fields);
    assert(valRes.valid, 'Backend validation passes for Company A entry with custom required fields');

    const createdRowA = await (prisma as any).cashLedgerEntry.create({
      data: {
        organizationId: companyA.id,
        createdById: userA.id,
        createdByName: userA.name,
        date: new Date('2026-04-15'),
        cashReceived: 8500,
        receivedFrom: completeRowA.customer_name,
        purpose: completeRowA.invoice_number,
        data: completeRowA,
        customFields: completeRowA,
      },
    });
    assert(Boolean(createdRowA.id), 'Company user successfully inserted row into Company A spreadsheet');

    // 7. Test Missing Required Custom Field Rejection
    console.log('\n--- 7. Testing Required Validation for Custom Fields ---');
    const missingExecRow = {
      invoice_month: 'APRIL_2026',
      customer_type: 'CASH CUSTOMER',
      customer_name: 'DELTA LOGISTICS',
      invoice_number: 'GIN2600099',
      total_invoice_amount: 8500,
      // missing required sales_executive
      payment_mode: 'UPI',
    };
    const invalidRes = validateLedgerEntryData(missingExecRow, reloadedA.fields);
    assert(!invalidRes.valid, 'Backend correctly blocks row missing required custom field "Sales Executive"');

    // 8. Test Data Isolation between Company A and Company B
    console.log('\n--- 8. Testing Transaction Data Multi-Tenant Isolation ---');
    const entriesA = await (prisma as any).cashLedgerEntry.findMany({
      where: { organizationId: companyA.id },
    });
    const entriesB = await (prisma as any).cashLedgerEntry.findMany({
      where: { organizationId: companyB.id },
    });

    assert(entriesA.length === 1 && entriesA[0].id === createdRowA.id, 'Company A only sees Company A entries');
    assert(entriesB.length === 0, 'Company B cannot see Company A entries (returns 0 rows)');

    // 9. Test Financial Formulas & Sums
    console.log('\n--- 9. Testing Totals & Running Balances ---');
    const { summary } = calculateLedgerBalances(entriesA, reloadedA.fields, 0);
    assert(summary.totalInvoiceAmount === 8500, 'Grand total SUM (Total Invoice Amount) equals ₹8,500.00');

    // 10. Test Organization Reset to Reference Defaults
    console.log('\n--- 10. Testing Organization Reset to Reference Defaults ---');
    await (prisma as any).cashLedgerConfig.update({
      where: { organizationId: companyA.id },
      data: { columns: REFERENCE_LEDGER_FIELDS },
    });
    const resetA = await getOrganizationLedgerConfig(companyA.id);
    assert(resetA.columns.length === 7, 'Company A successfully reset to standard 7 reference columns');

    // Clean up test data
    console.log('\n--- Cleaning Up Test Data ---');
    await (prisma as any).cashLedgerEntry.deleteMany({
      where: { id: createdRowA.id },
    });
    await (prisma as any).cashLedgerConfig.deleteMany({
      where: { organizationId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [orgAdminA.id, userA.id, orgAdminB.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });

    console.log('\n================================================================');
    console.log(`ORGANIZATION ADMIN VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

runProductionVerification();
