import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface SendEmailOptions {
  to: string;
  templateName: string;
  variables: Record<string, string>;
}

export const DEFAULT_TEMPLATES = {
  VERIFY_EMAIL: {
    subject: 'Verify your email - GEO TRANSIT',
    body: `Hello {{name}},\n\nWelcome to GEO TRANSIT! Please verify your email by clicking the link below:\n\n{{link}}\n\nThis link will expire in 24 hours.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  WELCOME: {
    subject: 'Welcome to GEO TRANSIT!',
    body: `Hello {{name}},\n\nYour email has been successfully verified, and your account is active!\n\nYou can now log in to access the Volumetric Weight Calculator (Demo Account, 10 calculations limit).\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PASSWORD_RESET: {
    subject: 'Reset your password - GEO TRANSIT',
    body: `Hello {{name}},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n{{link}}\n\nThis link will expire in 1 hour.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PAYMENT_SUBMITTED: {
    subject: 'Payment Submitted - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour payment for {{planName}} ({{duration}} Months) has been submitted successfully.\n\nUTR: {{utr}}\nAmount: {{amount}}\nStatus: PENDING APPROVAL\n\nOur administrator will verify the payment and activate your subscription shortly.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PAYMENT_APPROVED: {
    subject: 'Payment Approved & Subscription Active - GEO TRANSIT',
    body: `Hello {{name}},\n\nGood news! Your payment of {{amount}} has been approved.\n\nYour subscription to {{planName}} ({{duration}} Months) is now ACTIVE.\nDevice limit: {{deviceLimit}} devices.\nExpiry Date: {{expiryDate}}\n\nLog in to your dashboard to access your full features.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PAYMENT_REJECTED: {
    subject: 'Payment Verification Failed - GEO TRANSIT',
    body: `Hello {{name}},\n\nUnfortunately, we could not verify your payment submission for {{planName}} (UTR: {{utr}}).\n\nReason: {{reason}}\n\nPlease check your transaction details and resubmit from your dashboard.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  SUBSCRIPTION_ACTIVATED: {
    subject: 'Subscription Activated - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour subscription to {{planName}} has been activated successfully.\nDevice Limit: {{deviceLimit}}\nExpiry Date: {{expiryDate}}\n\nRegards,\nTeam GEO TRANSIT`,
  },
  SUBSCRIPTION_EXPIRY_WARNING: {
    subject: 'Subscription Expiry Warning - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour subscription to {{planName}} is expiring soon on {{expiryDate}}.\n\nPlease renew your plan from the billing section to avoid interruption.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  INVOICE: {
    subject: 'Invoice for your GEO TRANSIT Subscription',
    body: `Hello {{name}},\n\nPlease find attached the invoice (Invoice Number: {{invoiceNumber}}) for your recent purchase of {{planName}} ({{duration}} Months).\n\nTotal paid: {{amount}} (including GST).\n\nRegards,\nTeam GEO TRANSIT`,
  },
  ORG_ADMIN_ACCESS: {
    subject: 'Organization Admin Account Credentials - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour subscription for {{companyName}} is now ACTIVE!\n\nWe have provisioned an Organization Admin Account for your company with access to Employee Management, Attendance Tracking, Payroll, and Subscribed Logistics Modules.\n\nOrganization Admin Credentials:\nCompany: {{companyName}}\nAdmin Email / Username: {{adminEmail}}\nTemporary Password: {{tempPassword}}\nLogin Link: {{loginUrl}}\n\nSECURITY NOTICE: You will be required to change this temporary password immediately upon first login.\n\nSubscription Plan: {{planName}} ({{deviceLimit}} Devices)\nExpiry Date: {{expiryDate}}\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PACKAGING_REQUIREMENT_SUBMITTED: {
    subject: 'Custom Packaging Requirement Submitted - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour custom packaging requirement has been submitted successfully.\n\nMaterial/Product: {{productMaterial}}\nQuantity: {{quantity}}\nExpected Delivery Location: {{location}}\nRequired Date: {{requiredDate}}\n\nWe will review your requirement and provide a quotation shortly.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PACKAGING_QUOTATION_CREATED: {
    subject: 'New Packaging Quotation Received - GEO TRANSIT',
    body: `Hello {{name}},\n\nWe have reviewed your packaging requirement and created a custom quotation for you.\n\nQuote Number: {{quotationNumber}}\nFinal Quoted Amount: INR {{finalAmount}}\nQuotation Validity: {{validUntil}}\n\nLog in to your account and go to "My Custom Requirements" to view the details and proceed to payment.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PACKAGING_QUOTATION_ACCEPTED: {
    subject: 'Custom Packaging Quotation Accepted - GEO TRANSIT',
    body: `Hello {{name}},\n\nYour packaging quotation (Quote Number: {{quotationNumber}}) has been accepted.\n\nPlease proceed with the payment of INR {{finalAmount}} via UPI or Bank Transfer.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  PACKAGING_ORDER_CONFIRMED: {
    subject: 'Packaging Order Confirmed - GEO TRANSIT',
    body: `Hello {{name}},\n\nGood news! Your payment for Packaging Order (Order Number: {{orderNumber}}) has been verified and approved.\n\nTotal amount: INR {{amount}}\nOrder Status: PAID / PROCESSING\n\nYour packaging materials are being prepared for dispatch.\n\nRegards,\nTeam GEO TRANSIT`,
  },
  USER_CREDENTIALS: {
    subject: 'GEO TRANSIT — Your User Account Has Been Created',
    body: `Hello {{name}},\n\nWelcome to GEO TRANSIT! Your user account has been successfully created by your Organization Administrator for {{companyName}}.\n\nYour Account Details:\n- Company / Organization: {{companyName}}\n- Login Email: {{loginEmail}}\n- Assigned Role: {{assignedRole}}\n- Available Modules: {{assignedModules}}\n- License Expiry Date: {{expiryDate}}\n\nLogin Instructions:\n1. Visit the GEO TRANSIT console at: {{loginUrl}}\n2. Log in using your email ({{loginEmail}}) and the password provided by your Organization Administrator.\n3. You will have access to your assigned modules based on your role.\n\nIf you ever need a password reset or encounter any issues, please contact your Organization Administrator.\n\nRegards,\nTeam GEO TRANSIT`,
  },
};

export interface SmtpResolvedConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: string;
  fromName: string;
  fromEmail: string;
}

function isPlaceholderValue(val?: string | null): boolean {
  if (!val) return true;
  const lower = val.trim().toLowerCase();
  return lower === '' || lower.includes('placeholder') || lower.includes('smtp.mailtrap.io');
}

export async function getResolvedSmtpConfig(overridePassword?: string): Promise<SmtpResolvedConfig | null> {
  const dbSmtp = await prisma.sMTPSettings.findFirst();

  let host = dbSmtp?.host;
  let port = dbSmtp?.port;
  let username = dbSmtp?.username;
  let password = dbSmtp?.password;
  let encryption = dbSmtp?.encryption || 'TLS';
  let fromName = dbSmtp?.fromName;
  let fromEmail = dbSmtp?.fromEmail;

  // Fallback to ENV if DB settings are missing or contain default placeholders
  if (isPlaceholderValue(host) || isPlaceholderValue(username)) {
    host = process.env.SMTP_HOST || host || '';
    port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : port;
    username = process.env.SMTP_USER || username || '';
    password = process.env.SMTP_PASSWORD || password || '';
    encryption = process.env.SMTP_ENCRYPTION || encryption || 'TLS';
    fromName = process.env.SMTP_FROM_NAME || fromName || 'GEO TRANSIT';
    fromEmail = process.env.SMTP_FROM || fromEmail || username || 'no-reply@geotransit.com';
  }

  if (overridePassword && overridePassword !== '*****') {
    password = overridePassword;
  }

  // Sanitize Gmail App Passwords by removing spaces if Gmail SMTP is used
  if (password && host && host.toLowerCase().includes('gmail.com')) {
    password = password.replace(/\s+/g, '');
  }

  const resolvedPort = port ? Number(port) : 587;
  const resolvedHost = (host || '').trim();
  const resolvedUser = (username || '').trim();
  const resolvedPass = (password || '').trim();
  const resolvedFromName = (fromName || 'GEO TRANSIT').trim();
  const resolvedFromEmail = (fromEmail || resolvedUser || 'no-reply@geotransit.com').trim();

  if (!resolvedHost || !resolvedUser || !resolvedPass) {
    return null;
  }

  return {
    host: resolvedHost,
    port: resolvedPort,
    username: resolvedUser,
    password: resolvedPass,
    encryption: (encryption || 'TLS').toUpperCase(),
    fromName: resolvedFromName,
    fromEmail: resolvedFromEmail,
  };
}

export function sanitizeErrorMessage(errorMsg: string, secret?: string): string {
  let clean = errorMsg || 'Unknown SMTP error';
  if (secret && secret.length > 2) {
    clean = clean.split(secret).join('*****');
  }
  return clean;
}

export function createSmtpTransporter(config: SmtpResolvedConfig) {
  const secure = config.encryption === 'SSL' || config.port === 465;
  const requireTLS = !secure && config.encryption !== 'NONE';

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS,
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail({ to, templateName, variables }: SendEmailOptions) {
  const config = await getResolvedSmtpConfig();

  // 2. Get Email Template from DB
  const dbTemplate = await prisma.emailTemplate.findUnique({
    where: { name: templateName },
  });

  const template = dbTemplate || DEFAULT_TEMPLATES[templateName as keyof typeof DEFAULT_TEMPLATES];

  if (!template) {
    throw new Error(`Email template ${templateName} not found`);
  }

  // Render subject and body variables
  let subject = template.subject;
  let body = template.body;

  Object.entries(variables).forEach(([key, val]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, val);
    body = body.replace(regex, val);
  });

  if (!config) {
    // SMTP not configured
    console.log('=== SMTP NOT CONFIGURED ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body:');
    console.log(body);
    console.log('==========================');
    return {
      success: false,
      notConfigured: true,
      loggedBody: body,
      loggedSubject: subject,
    };
  }

  try {
    const transporter = createSmtpTransporter(config);

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });

    if (info.rejected && info.rejected.length > 0 && (!info.accepted || info.accepted.length === 0)) {
      const err = `SMTP server rejected delivery to recipient(s): ${info.rejected.join(', ')}`;
      console.error('SMTP Rejected Error:', err);
      return { success: false, error: err };
    }

    return { success: true, messageId: info.messageId, accepted: info.accepted };
  } catch (error: any) {
    const cleanError = sanitizeErrorMessage(error.message, config.password);
    console.error('SMTP Send Error:', cleanError);
    return { success: false, error: cleanError };
  }
}

