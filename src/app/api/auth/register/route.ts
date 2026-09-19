import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { name, email, mobile, company, password, confirmPassword, acceptTerms } = await req.json();

    // 1. Validation
    if (!name || !email || !mobile || !company || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (!acceptTerms) {
      return NextResponse.json({ error: 'You must accept the terms and conditions.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    // 3. Hash password and create user
    const hashedPassword = await hashPassword(password);
    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const settings = await prisma.websiteSettings.findFirst();
    const demoDuration = settings?.demoDurationDays ?? 10;
    const demoStartedAt = new Date();
    const demoExpiresAt = new Date(demoStartedAt.getTime() + demoDuration * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        mobile,
        company,
        password: hashedPassword,
        emailVerified: true, // Auto-activated for instant sign in
        status: 'ACTIVE',
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        role: 'OWNER', // Customer Owner Account
        demoStartedAt,
        demoExpiresAt,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      action: 'Customer Registered (Owner Account Created)',
      userId: user.id,
      userEmail: user.email,
      metadata: { role: 'OWNER', company: user.company },
    });

    // 4. Send Verification Email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyLink = `${appUrl}/verify-email?token=${token}`;

    const emailResult = await sendEmail({
      to: user.email,
      templateName: 'VERIFY_EMAIL',
      variables: {
        name: user.name,
        link: verifyLink,
      },
    });

    // 5. In development, if SMTP isn't configured, we display the link on the register success screen.
    const isDev = process.env.NODE_ENV !== 'production';
    const devVerifyLink = (isDev && emailResult.notConfigured) ? verifyLink : null;

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      devVerifyLink, // Convenient testing fallback
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
