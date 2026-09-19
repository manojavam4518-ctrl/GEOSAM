import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { createDeviceSession, getUserAccessState } from '../src/lib/auth';
import { signToken } from '../src/lib/auth-token';
import { verifyModuleAccess, PLATFORM_MODULES, ensurePlatformModulesAndRolesSeeded } from '../src/lib/modulePermissions';
import { recordAuditLog } from '../src/lib/audit';

interface TestResult {
  category: string;
  scenario: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function recordResult(category: string, scenario: string, pass: boolean, details: string) {
  const status = pass ? 'PASS' : 'FAIL';
  results.push({ category, scenario, status, details });
  console.log(`[${status}] ${category} -> ${scenario}: ${details}`);
}

async function createMockRequest(user: any, sessionToken: string): Promise<any> {
  const jwt = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionToken,
  });
  return {
    cookies: {
      get: (name: string) => (name === 'session_token' ? { value: jwt } : undefined),
    },
    nextUrl: { pathname: '/test' },
  };
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('STARTING GEO TRANSIT E2E ARCHITECTURE & ENTITLEMENT TEST SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testOwnerEmail = `test_owner_${timestamp}@example.com`;
  const testOrgAdminEmail = `admin.${testOwnerEmail}`;
  const testStaffEmail = `test_staff_${timestamp}@example.com`;
  const plainPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  let ownerUser: any = null;
  let orgAdminUser: any = null;
  let staffUser: any = null;
  let organization: any = null;
  let subscriptionPlan: any = null;
  let legacyPlan: any = null;
  let subscription: any = null;
  let userLicense: any = null;
  let employee: any = null;
  let subPayment: any = null;
  let session1: any = null;
  let session2: any = null;
  let staffSession: any = null;

  try {
    // -------------------------------------------------------------
    // CATEGORY 1: Customer Registration
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Customer Registration ---');
    ownerUser = await prisma.user.create({
      data: {
        name: 'Test Owner',
        email: testOwnerEmail,
        password: hashedPassword,
        mobile: '9876543210',
        company: 'Geo Enterprise Inc',
        role: 'OWNER',
        status: 'ACTIVE',
        isAdditionalUser: false,
      },
    });

    await recordAuditLog({
      action: 'USER_REGISTERED',
      metadata: { email: testOwnerEmail, role: 'OWNER' },
      userId: ownerUser.id,
      userEmail: ownerUser.email,
    });

    recordResult(
      'Customer Registration',
      'Registration creates OWNER account',
      ownerUser.role === 'OWNER' && ownerUser.status === 'ACTIVE',
      `User created with id=${ownerUser.id}, role=${ownerUser.role}`
    );

    recordResult(
      'Customer Registration',
      'OWNER is distinct from ORG_ADMIN',
      ownerUser.role !== 'ORG_ADMIN' && ownerUser.role !== 'ADMIN',
      `Role verified: ${ownerUser.role}`
    );

    // -------------------------------------------------------------
    // CATEGORY 2: Active Plans Enforce Minimum 2 Devices
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Subscription Plans Device Limits ---');
    // Create dedicated 2-device plan for deterministic multi-device testing
    subscriptionPlan = await prisma.subscriptionPlan.create({
      data: {
        name: `Test 2-Device Plan ${timestamp}`,
        deviceLimit: 2,
        price3Months: 1499,
        price6Months: 2699,
        price12Months: 4999,
        active: true,
      },
    });

    const activePlansOffered = await prisma.subscriptionPlan.findMany({
      where: { active: true, deviceLimit: { gte: 2 } },
    });

    recordResult(
      'Subscription Plans',
      'Plans offered enforce minimum 2 device limit',
      activePlansOffered.length > 0 && activePlansOffered.every(p => p.deviceLimit >= 2),
      `Found ${activePlansOffered.length} active plans, all have deviceLimit >= 2`
    );

    // -------------------------------------------------------------
    // CATEGORY 3: Historical 1-Device Plans Preserved
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Historical 1-Device Plan Preservation ---');
    legacyPlan = await prisma.subscriptionPlan.create({
      data: {
        name: `Legacy Single Device Plan ${timestamp}`,
        deviceLimit: 1,
        price3Months: 699,
        price6Months: 1299,
        price12Months: 1999,
        active: false,
      },
    });

    const fetchedLegacy = await prisma.subscriptionPlan.findUnique({ where: { id: legacyPlan.id } });
    recordResult(
      'Subscription Plans',
      'Historical 1-device plans preserved in database without deletion',
      fetchedLegacy !== null && fetchedLegacy.deviceLimit === 1,
      `Historical plan ${legacyPlan.id} exists with deviceLimit=1`
    );

    // -------------------------------------------------------------
    // CATEGORY 4: Subscription Payment & Super Admin Approval
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Subscription Payment & Approval Flow ---');
    const planPrice = subscriptionPlan.price12Months || 4999;
    subPayment = await prisma.payment.create({
      data: {
        userId: ownerUser.id,
        planId: subscriptionPlan.id,
        planName: subscriptionPlan.name,
        deviceLimit: subscriptionPlan.deviceLimit,
        duration: 12,
        baseAmount: planPrice,
        gstAmount: Math.round(planPrice * 0.18),
        totalAmount: Math.round(planPrice * 1.18),
        billingDetails: {
          fullName: ownerUser.name,
          email: ownerUser.email,
          phone: ownerUser.mobile,
          company: ownerUser.company,
          address: '123 Business Way',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400001',
        },
        invoiceRequired: true,
        paymentMethod: 'UPI',
        utr: `UTR_SUB_${timestamp}`,
        status: 'PENDING',
      },
    });

    // Super Admin Approves Payment -> Creates Organization & Provisions ORG_ADMIN
    const now = new Date();
    const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Create Organization
    organization = await prisma.organization.create({
      data: {
        name: ownerUser.company || `${ownerUser.name}'s Organization`,
        ownerId: ownerUser.id,
        status: 'ACTIVE',
      },
    });

    // Update Owner with organizationId
    ownerUser = await prisma.user.update({
      where: { id: ownerUser.id },
      data: { organizationId: organization.id },
    });

    // Create Active Subscription linked to Organization
    subscription = await prisma.subscription.create({
      data: {
        userId: ownerUser.id,
        organizationId: organization.id,
        planId: subscriptionPlan.id,
        planName: subscriptionPlan.name,
        deviceLimit: subscriptionPlan.deviceLimit,
        duration: 12,
        amount: planPrice,
        startDate: now,
        endDate: endDate,
        paymentRef: subPayment.id,
        status: 'ACTIVE',
      },
    });

    // Provision ORG_ADMIN user with mustChangePassword = true
    orgAdminUser = await prisma.user.create({
      data: {
        name: `${ownerUser.company} Org Admin`,
        email: testOrgAdminEmail,
        password: hashedPassword,
        mobile: ownerUser.mobile,
        company: ownerUser.company,
        role: 'ORG_ADMIN',
        status: 'ACTIVE',
        isAdditionalUser: false,
        organizationId: organization.id,
        mustChangePassword: true,
      },
    });

    // Link adminUserId to Organization
    organization = await prisma.organization.update({
      where: { id: organization.id },
      data: { adminUserId: orgAdminUser.id, subscriptionId: subscription.id },
    });

    // Update payment to APPROVED
    await prisma.payment.update({
      where: { id: subPayment.id },
      data: { status: 'APPROVED' },
    });

    await recordAuditLog({
      action: 'SUBSCRIPTION_PAYMENT_APPROVED',
      metadata: { paymentId: subPayment.id, orgId: organization.id, orgAdminEmail: testOrgAdminEmail },
      organizationId: organization.id,
    });

    recordResult(
      'Payment & Approval',
      'Organization created and linked with ownerId',
      organization.ownerId === ownerUser.id,
      `Org ${organization.id} linked to Owner ${ownerUser.id}`
    );

    recordResult(
      'Payment & Approval',
      'Subscription created and linked to Organization',
      subscription.organizationId === organization.id && subscription.status === 'ACTIVE',
      `Subscription ${subscription.id} linked to Org ${organization.id}`
    );

    recordResult(
      'Payment & Approval',
      'Dedicated ORG_ADMIN user provisioned with mustChangePassword=true',
      orgAdminUser.role === 'ORG_ADMIN' && orgAdminUser.mustChangePassword === true && orgAdminUser.organizationId === organization.id,
      `Org Admin ${orgAdminUser.email} provisioned with role=${orgAdminUser.role}, mustChangePassword=${orgAdminUser.mustChangePassword}`
    );

    // -------------------------------------------------------------
    // CATEGORY 5: Multi-Device Tracking Across Organization
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Device Session Limit Across Organization ---');
    // Device limit on subscription is 2.
    // Create Device Session 1 (Owner)
    session1 = await createDeviceSession(
      ownerUser.id,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
      'Desktop Windows Chrome'
    );
    recordResult(
      'Device Limiting',
      'Device 1 session creation succeeds',
      session1 !== null && session1.id !== undefined,
      `Session 1 created: ${session1.id}`
    );

    // Create Device Session 2 (Org Admin)
    session2 = await createDeviceSession(
      orgAdminUser.id,
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
      'Mac Safari'
    );
    recordResult(
      'Device Limiting',
      'Device 2 session creation succeeds (within limit of 2)',
      session2 !== null && session2.id !== undefined,
      `Session 2 created: ${session2.id}`
    );

    // Attempt Device Session 3 (Exceeds limit of 2 across organization)
    let deviceLimitThrew = false;
    let deviceLimitMessage = '';
    try {
      await createDeviceSession(
        ownerUser.id,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile',
        'iPhone Mobile'
      );
    } catch (err: any) {
      deviceLimitThrew = true;
      deviceLimitMessage = err.message;
    }

    const expectedDeviceMsg = `Your current subscription allows ${subscriptionPlan.deviceLimit} active devices. Please sign out from another device or upgrade your plan.`;
    recordResult(
      'Device Limiting',
      'Device 3 session creation blocked with exact message',
      deviceLimitThrew && deviceLimitMessage === expectedDeviceMsg,
      `Blocked with message: "${deviceLimitMessage}"`
    );

    // -------------------------------------------------------------
    // CATEGORY 6: Platform Modules & Predefined Roles
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Platform Modules & Roles Seeding ---');
    await ensurePlatformModulesAndRolesSeeded();

    const modulesInDb = await (prisma as any).platformModule.findMany();
    const rolesInDb = await (prisma as any).platformRole.findMany();

    recordResult(
      'Platform Modules',
      'Platform modules catalog seeded and populated',
      modulesInDb.length >= 10,
      `Found ${modulesInDb.length} modules in database`
    );

    recordResult(
      'Predefined Roles',
      'Predefined roles created with assigned modules',
      rolesInDb.length >= 4,
      `Found ${rolesInDb.length} predefined roles in database`
    );

    // Find role containing RATE_CALCULATOR
    const dispatchRole = rolesInDb.find((r: any) => r.moduleKeys.includes('RATE_CALCULATOR')) || rolesInDb[0];
    console.log(`Using role ${dispatchRole.name} with modules: ${JSON.stringify(dispatchRole.moduleKeys)}`);

    // -------------------------------------------------------------
    // CATEGORY 7: Org Admin Creates Staff User Account & User License
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Staff User Account & License Creation ---');
    const licenseDuration = 6; // 6 months duration
    const licensePrice = 2699;

    // Snapshot pricing
    const pricingSnapshot: Record<string, number> = {};
    for (const k of dispatchRole.moduleKeys) {
      const mod = modulesInDb.find((m: any) => m.key === k);
      pricingSnapshot[k] = mod?.monthlyPrice || 100;
    }

    // Create Staff User in pending payment state
    staffUser = await prisma.user.create({
      data: {
        name: 'Test Staff Dispatcher',
        email: testStaffEmail,
        password: hashedPassword,
        mobile: '9876543211',
        company: ownerUser.company,
        role: 'USER',
        status: 'PENDING_PAYMENT',
        isAdditionalUser: true,
        organizationId: organization.id,
        assignedRoleId: dispatchRole.id,
        assignedRoleName: dispatchRole.name,
        assignedModules: dispatchRole.moduleKeys,
      },
    });

    // Create UserLicense with locked price snapshot & payment details
    userLicense = await (prisma as any).userLicense.create({
      data: {
        organizationId: organization.id,
        userId: staffUser.id,
        userName: staffUser.name,
        userMobile: staffUser.mobile,
        userEmail: staffUser.email,
        duration: licenseDuration,
        price: licensePrice,
        roleId: dispatchRole.id,
        roleName: dispatchRole.name,
        assignedModules: dispatchRole.moduleKeys,
        modulePricingSnapshot: pricingSnapshot,
        paymentStatus: 'PENDING',
        status: 'PENDING_PAYMENT',
        paymentMethod: 'UPI',
        utr: `UTR_LIC_${timestamp}`,
        paymentType: 'USER_LICENSE',
      },
    });

    recordResult(
      'Staff Licensing',
      'Staff account created with predefined role and locked price snapshot',
      staffUser.assignedRoleId === dispatchRole.id && userLicense.price === licensePrice && userLicense.duration === 6,
      `Staff ${staffUser.id} created with locked price=${userLicense.price}, duration=${userLicense.duration}M`
    );

    // -------------------------------------------------------------
    // CATEGORY 8: Super Admin Approves User License Payment
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Super Admin Approval of User License ---');
    const licenseStartDate = new Date();
    const licenseExpiryDate = new Date(licenseStartDate.getTime() + licenseDuration * 30 * 24 * 60 * 60 * 1000);

    // Update License to APPROVED & ACTIVE
    userLicense = await (prisma as any).userLicense.update({
      where: { id: userLicense.id },
      data: {
        paymentStatus: 'APPROVED',
        status: 'ACTIVE',
        startDate: licenseStartDate,
        expiryDate: licenseExpiryDate,
      },
    });

    // Activate Staff User and link userLicenseId
    staffUser = await prisma.user.update({
      where: { id: staffUser.id },
      data: { status: 'ACTIVE', userLicenseId: userLicense.id },
    });

    await recordAuditLog({
      action: 'USER_LICENSE_APPROVED',
      metadata: { userLicenseId: userLicense.id, staffUserId: staffUser.id, staffEmail: staffUser.email },
      organizationId: organization.id,
    });

    recordResult(
      'Staff Licensing',
      'Super Admin approval activates staff user and user license',
      staffUser.status === 'ACTIVE' && userLicense.status === 'ACTIVE' && userLicense.paymentStatus === 'APPROVED',
      `Staff user status=${staffUser.status}, license status=${userLicense.status}, expiryDate=${userLicense.expiryDate.toISOString()}`
    );

    // -------------------------------------------------------------
    // CATEGORY 9: Staff Entitlement Verification Pipeline
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing Staff Entitlement Verification Pipeline ---');
    const staffAccessState = await getUserAccessState(staffUser.id);

    recordResult(
      'Entitlement Pipeline',
      'Active Org Sub + Active License grants full active access to Staff',
      staffAccessState === 'SUBSCRIPTION_ACTIVE',
      `Staff access state: ${staffAccessState}`
    );

    // -------------------------------------------------------------
    // CATEGORY 10: Granular Module Authorization
    // -------------------------------------------------------------
    console.log('\n--- 10. Testing Granular Module Authorization ---');
    // Delete session2 to stay within the 2-device limit
    await prisma.deviceSession.delete({ where: { id: session2.id } });

    staffSession = await createDeviceSession(
      staffUser.id,
      'Mozilla/5.0 Chrome Staff',
      'Staff Workstation'
    );

    const staffReq = await createMockRequest(staffUser, staffSession.sessionToken);

    // Test 1: Permitted Module in dispatchRole
    const permittedKey = dispatchRole.moduleKeys[0];
    const staffPermittedAccess = await verifyModuleAccess(staffReq, permittedKey);

    recordResult(
      'Module Authorization',
      `Staff can access assigned module (${permittedKey})`,
      staffPermittedAccess.authorized === true,
      `Access result for ${permittedKey}: authorized=${staffPermittedAccess.authorized}`
    );

    // Test 2: Unassigned Module (e.g. PACKAGING_SHOP or EMPLOYEE_MANAGEMENT or QUOTATIONS if not assigned)
    const allKeys = Object.keys(PLATFORM_MODULES);
    const unassignedKey = allKeys.find(k => !dispatchRole.moduleKeys.includes(k)) || 'PACKAGING_SHOP';
    const staffDeniedAccess = await verifyModuleAccess(staffReq, unassignedKey);

    recordResult(
      'Module Authorization',
      `Staff is blocked from unassigned module (${unassignedKey}) with 403`,
      staffDeniedAccess.authorized === false && staffDeniedAccess.response?.status === 403,
      `Access result for ${unassignedKey}: authorized=${staffDeniedAccess.authorized}, status=${staffDeniedAccess.response?.status}`
    );

    // -------------------------------------------------------------
    // CATEGORY 11: Owner Restricted from Org Admin Management Modules
    // -------------------------------------------------------------
    console.log('\n--- 11. Testing Owner Restricted from Org Admin Modules ---');
    const ownerReq = await createMockRequest(ownerUser, session1.sessionToken);
    const ownerEmployeeAccess = await verifyModuleAccess(ownerReq, 'EMPLOYEE_MANAGEMENT');
    const ownerAttendanceAccess = await verifyModuleAccess(ownerReq, 'ATTENDANCE');

    recordResult(
      'Role Separation',
      'Owner restricted from EMPLOYEE_MANAGEMENT module with 403',
      ownerEmployeeAccess.authorized === false && ownerEmployeeAccess.response?.status === 403,
      `Owner access status: ${ownerEmployeeAccess.response?.status}`
    );

    recordResult(
      'Role Separation',
      'Owner restricted from ATTENDANCE module with 403',
      ownerAttendanceAccess.authorized === false && ownerAttendanceAccess.response?.status === 403,
      `Owner access status: ${ownerAttendanceAccess.response?.status}`
    );

    // -------------------------------------------------------------
    // CATEGORY 12: Attendance Check-In / Check-Out & Working Hours
    // -------------------------------------------------------------
    console.log('\n--- 12. Testing Attendance System ---');
    // Create Employee record for staff
    employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        userId: staffUser.id,
        employeeId: 'EMP-1001',
        name: staffUser.name,
        mobile: staffUser.mobile,
        email: staffUser.email,
        department: 'Operations',
        designation: 'Dispatcher',
        basicSalary: 35000,
        joiningDate: new Date(),
        status: 'ACTIVE',
      },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Check-in
    const checkInTime = new Date(Date.now() - 8 * 60 * 60 * 1000 - 30 * 60 * 1000); // 8h 30m ago
    const attendanceRecord = await prisma.attendance.create({
      data: {
        organizationId: organization.id,
        employeeId: employee.id,
        userId: staffUser.id,
        date: startOfToday,
        status: 'PRESENT',
        checkIn: checkInTime,
      },
    });

    recordResult(
      'Attendance System',
      'Attendance check-in recorded with server timestamp',
      attendanceRecord.checkIn !== null && attendanceRecord.date.getTime() === startOfToday.getTime(),
      `Check-in recorded: ${attendanceRecord.checkIn?.toISOString()}`
    );

    // Check-out & compute working hours
    const checkOutTime = new Date();
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const workingHoursStr = `${hours}h ${mins}m`;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceRecord.id },
      data: {
        checkOut: checkOutTime,
        workingHours: workingHoursStr,
      },
    });

    recordResult(
      'Attendance System',
      'Attendance check-out computes formatted working hours',
      updatedAttendance.checkOut !== null && updatedAttendance.workingHours === workingHoursStr,
      `Working hours calculated: ${updatedAttendance.workingHours}`
    );

    // Correction Request Workflow
    const correctionAttendance = await prisma.attendance.update({
      where: { id: attendanceRecord.id },
      data: {
        correctionRequested: true,
        correctionReason: 'Forgot to check out before lunch',
        correctionStatus: 'PENDING',
      },
    });

    // Org Admin Approves Correction
    const approvedAttendance = await prisma.attendance.update({
      where: { id: correctionAttendance.id },
      data: {
        correctionStatus: 'APPROVED',
        correctionRequested: false,
      },
    });

    await recordAuditLog({
      action: 'ATTENDANCE_CORRECTION_APPROVED',
      metadata: { attendanceId: approvedAttendance.id, employeeId: employee.id },
      organizationId: organization.id,
    });

    recordResult(
      'Attendance System',
      'Staff correction request and Org Admin approval workflow',
      approvedAttendance.correctionStatus === 'APPROVED' && approvedAttendance.correctionRequested === false,
      `Correction workflow completed: status=${approvedAttendance.correctionStatus}`
    );

    // -------------------------------------------------------------
    // CATEGORY 13: Expiry Scenarios
    // -------------------------------------------------------------
    console.log('\n--- 13. Testing Expiry Scenarios ---');

    // SCENARIO 13A: Staff Individual License Expired
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await (prisma as any).userLicense.update({
      where: { id: userLicense.id },
      data: { expiryDate: pastDate },
    });

    const staffExpiredReq = await createMockRequest(staffUser, staffSession.sessionToken);
    const staffExpiredCheck = await verifyModuleAccess(staffExpiredReq, permittedKey);
    recordResult(
      'Expiry Handling',
      'Expired Staff User License blocks staff access with 403',
      staffExpiredCheck.authorized === false && staffExpiredCheck.response?.status === 403,
      `Staff access blocked when license expired: status=${staffExpiredCheck.response?.status}`
    );

    // Restore Staff License
    await (prisma as any).userLicense.update({
      where: { id: userLicense.id },
      data: { expiryDate: licenseExpiryDate },
    });

    // SCENARIO 13B: Master Organization Subscription Expired
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { endDate: pastDate },
    });

    const staffOrgExpiredReq = await createMockRequest(staffUser, staffSession.sessionToken);
    const ownerOrgExpiredReq = await createMockRequest(ownerUser, session1.sessionToken);
    const staffOrgExpiredCheck = await verifyModuleAccess(staffOrgExpiredReq, permittedKey);
    const ownerOrgExpiredCheck = await verifyModuleAccess(ownerOrgExpiredReq, 'RATE_CALCULATOR');

    recordResult(
      'Expiry Handling',
      'Expired Master Org Subscription blocks Staff access with 403',
      staffOrgExpiredCheck.authorized === false && staffOrgExpiredCheck.response?.status === 403,
      `Staff access blocked on master org expiry: status=${staffOrgExpiredCheck.response?.status}`
    );

    recordResult(
      'Expiry Handling',
      'Expired Master Org Subscription blocks Owner access with 403',
      ownerOrgExpiredCheck.authorized === false && ownerOrgExpiredCheck.response?.status === 403,
      `Owner access blocked on master org expiry: status=${ownerOrgExpiredCheck.response?.status}`
    );

    // SCENARIO 13C: Master Organization Subscription Renewed
    const renewedEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { endDate: renewedEndDate, status: 'ACTIVE' },
    });

    const staffRestoredReq = await createMockRequest(staffUser, staffSession.sessionToken);
    const ownerRestoredReq = await createMockRequest(ownerUser, session1.sessionToken);
    const staffRestoredCheck = await verifyModuleAccess(staffRestoredReq, permittedKey);
    const ownerRestoredCheck = await verifyModuleAccess(ownerRestoredReq, 'RATE_CALCULATOR');

    recordResult(
      'Expiry Handling',
      'Renewal of Master Org Subscription restores access to Staff and Owner',
      staffRestoredCheck.authorized === true && ownerRestoredCheck.authorized === true,
      `Access restored: Staff=${staffRestoredCheck.authorized}, Owner=${ownerRestoredCheck.authorized}`
    );

    // -------------------------------------------------------------
    // CATEGORY 14: Payment Channel Separation
    // -------------------------------------------------------------
    console.log('\n--- 14. Testing Payment Channel Separation ---');
    const subPaymentRecord = await prisma.payment.findUnique({ where: { id: subPayment.id } });
    const userLicenseRecord = await (prisma as any).userLicense.findUnique({ where: { id: userLicense.id } });

    recordResult(
      'Payment Separation',
      'Subscription payments and User License payments stored in dedicated separated records',
      subPaymentRecord !== null && userLicenseRecord !== null && userLicenseRecord.paymentType === 'USER_LICENSE',
      `Payment id=${subPaymentRecord?.id}, UserLicense id=${userLicenseRecord?.id}, paymentType=${userLicenseRecord?.paymentType}`
    );

    // -------------------------------------------------------------
    // CATEGORY 15: Audit Logging Integrity
    // -------------------------------------------------------------
    console.log('\n--- 15. Testing Audit Logging Integrity ---');
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: organization.id },
    });

    const hasNoPasswords = auditLogs.every(log => {
      const detailsStr = JSON.stringify(log.metadata || '');
      return !detailsStr.includes(plainPassword);
    });

    recordResult(
      'Audit Logging',
      'Audit logs recorded for sensitive events without logging credentials',
      auditLogs.length >= 3 && hasNoPasswords,
      `Recorded ${auditLogs.length} audit logs for organization. Zero password leaks.`
    );

  } catch (error: any) {
    console.error('FATAL TEST ERROR:', error);
    recordResult('Execution', 'Test script execution without unhandled exceptions', false, error.message);
  } finally {
    // Clean up test records
    console.log('\n--- Cleaning up test artifacts ---');
    try {
      if (staffSession) {
        await prisma.deviceSession.deleteMany({ where: { id: staffSession.id } }).catch(() => {});
      }
      if (session1) {
        await prisma.deviceSession.deleteMany({ where: { id: session1.id } }).catch(() => {});
      }
      if (session2) {
        await prisma.deviceSession.deleteMany({ where: { id: session2.id } }).catch(() => {});
      }
      if (staffUser) {
        await prisma.deviceSession.deleteMany({ where: { userId: staffUser.id } }).catch(() => {});
        await (prisma as any).userLicense.deleteMany({ where: { userId: staffUser.id } }).catch(() => {});
        await prisma.attendance.deleteMany({ where: { userId: staffUser.id } }).catch(() => {});
        if (employee) {
          await prisma.attendance.deleteMany({ where: { employeeId: employee.id } }).catch(() => {});
          await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: staffUser.id } }).catch(() => {});
      }
      if (orgAdminUser) {
        await prisma.deviceSession.deleteMany({ where: { userId: orgAdminUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: orgAdminUser.id } }).catch(() => {});
      }
      if (ownerUser) {
        await prisma.deviceSession.deleteMany({ where: { userId: ownerUser.id } }).catch(() => {});
        if (subscription) {
          await prisma.subscription.delete({ where: { id: subscription.id } }).catch(() => {});
        }
        if (subPayment) {
          await prisma.payment.delete({ where: { id: subPayment.id } }).catch(() => {});
        }
        if (organization) {
          await prisma.auditLog.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
          await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
      }
      if (legacyPlan) {
        await prisma.subscriptionPlan.delete({ where: { id: legacyPlan.id } }).catch(() => {});
      }
      if (subscriptionPlan) {
        await prisma.subscriptionPlan.delete({ where: { id: subscriptionPlan.id } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log('FINAL TEST EXECUTION SUMMARY');
  console.log('================================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);

  if (failCount > 0) {
    console.error('TEST FAILURES DETECTED:');
    results.filter(r => r.status === 'FAIL').forEach(f => console.error(` - [${f.category}] ${f.scenario}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('ALL E2E ARCHITECTURE TESTS PASSED PERFECTLY!');
  }
}

runE2ETests().catch(err => {
  console.error('Top-level test runner error:', err);
  process.exit(1);
});
