import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: 'If the email is registered, you will receive a password reset link shortly.',
      });
    }

    // Generate Token
    const token = generateToken();
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const emailResult = await sendEmail({
      to: user.email,
      templateName: 'PASSWORD_RESET',
      variables: {
        name: user.name,
        link: resetLink,
      },
    });

    const isDev = process.env.NODE_ENV !== 'production';
    const devResetLink = (isDev && emailResult.notConfigured) ? resetLink : null;

    return NextResponse.json({
      success: true,
      message: 'If the email is registered, you will receive a password reset link shortly.',
      devResetLink,
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
