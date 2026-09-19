import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { getResolvedSmtpConfig, createSmtpTransporter, sanitizeErrorMessage } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const resolved = await getResolvedSmtpConfig();
    const smtpRecord = await prisma.sMTPSettings.findFirst();

    if (!resolved) {
      return NextResponse.json({
        success: true,
        smtp: {
          host: smtpRecord?.host || '',
          port: smtpRecord?.port || 587,
          username: smtpRecord?.username || '',
          encryption: smtpRecord?.encryption || 'TLS',
          fromName: smtpRecord?.fromName || 'GEO TRANSIT Support',
          fromEmail: smtpRecord?.fromEmail || '',
          hasPassword: !!smtpRecord?.password,
        },
      });
    }

    return NextResponse.json({
      success: true,
      smtp: {
        host: smtpRecord?.host || resolved.host,
        port: smtpRecord?.port || resolved.port,
        username: smtpRecord?.username || resolved.username,
        encryption: smtpRecord?.encryption || resolved.encryption,
        fromName: smtpRecord?.fromName || resolved.fromName,
        fromEmail: smtpRecord?.fromEmail || resolved.fromEmail,
        hasPassword: !!(smtpRecord?.password || resolved.password),
      },
    });
  } catch (error: any) {
    console.error('SMTP GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { host, port, username, password, encryption, fromName, fromEmail, isTest, testRecipient } = await req.json();

    if (isTest) {
      // 1. Send Test Email flow
      if (!testRecipient) {
        return NextResponse.json({ error: 'Test recipient email is required.' }, { status: 400 });
      }

      // Load existing password if masked
      let finalPassword = password;
      if (password === '*****' || !password) {
        const existingSmtp = await prisma.sMTPSettings.findFirst();
        finalPassword = existingSmtp?.password || process.env.SMTP_PASSWORD || '';
      }

      // Handle Gmail App Password space removal
      if (finalPassword && host && host.toLowerCase().includes('gmail.com')) {
        finalPassword = finalPassword.replace(/\s+/g, '');
      }

      if (!host || !port || !username || !finalPassword || !fromEmail) {
        return NextResponse.json(
          { error: 'Incomplete SMTP settings. Host, Port, Username, Password, and From Email are required to test.' },
          { status: 400 }
        );
      }

      const testConfig = {
        host: (host || '').trim(),
        port: parseInt(port) || 587,
        username: (username || '').trim(),
        password: (finalPassword || '').trim(),
        encryption: (encryption || 'TLS').toUpperCase(),
        fromName: (fromName || 'GEO TRANSIT').trim(),
        fromEmail: (fromEmail || username).trim(),
      };

      try {
        // Step 1: Create Nodemailer transporter
        const transporter = createSmtpTransporter(testConfig);

        // Step 2: Verify SMTP Connection
        await transporter.verify();

        // Step 3: Send real test email
        const info = await transporter.sendMail({
          from: `"${testConfig.fromName}" <${testConfig.fromEmail}>`,
          to: testRecipient,
          subject: 'Test Email - GEO TRANSIT SMTP Verification',
          text: 'This is a test email from GEO TRANSIT. Your SMTP settings are correctly configured and verified!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
              <h2 style="color: #0F4C3A; margin-top: 0;">GEO TRANSIT - SMTP Connection Verified</h2>
              <p style="color: #333; font-size: 14px; line-height: 1.6;">
                This is an automated test email to confirm that your SMTP mailer coordinates are correctly configured and actively delivering outgoing messages.
              </p>
              <div style="background-color: #f4f7f6; padding: 12px; rounded: 6px; font-size: 12px; color: #0F4C3A; margin: 15px 0;">
                <strong>Host:</strong> ${testConfig.host}<br/>
                <strong>Port:</strong> ${testConfig.port}<br/>
                <strong>Sender:</strong> ${testConfig.fromName} &lt;${testConfig.fromEmail}&gt;<br/>
                <strong>Recipient:</strong> ${testRecipient}
              </div>
              <p style="color: #888; font-size: 12px;">Regards,<br/>Team GEO TRANSIT</p>
            </div>
          `,
        });

        // Step 4: Audit Log
        await prisma.auditLog.create({
          data: {
            adminId: adminSession.userId,
            adminEmail: adminSession.user.email,
            action: 'Sent SMTP Test Email',
            metadata: { to: testRecipient, messageId: info.messageId },
          },
        });

        return NextResponse.json({
          success: true,
          message: `Test email successfully sent and accepted by SMTP server! Message ID: ${info.messageId}`,
        });
      } catch (testErr: any) {
        const cleanMessage = sanitizeErrorMessage(testErr.message, testConfig.password);
        console.error('SMTP Connection Test Failed:', cleanMessage);
        return NextResponse.json({ error: `SMTP Connection test failed: ${cleanMessage}` }, { status: 400 });
      }
    }

    // 2. Save SMTP settings flow
    if (!host || !port || !username || !fromEmail) {
      return NextResponse.json({ error: 'Host, Port, Username and From Email are required.' }, { status: 400 });
    }

    let existingSmtp = await prisma.sMTPSettings.findFirst();
    let finalPassword = password;

    if (existingSmtp && (password === '*****' || !password)) {
      finalPassword = existingSmtp.password;
    }

    // Handle Gmail App Password space removal
    if (finalPassword && host && host.toLowerCase().includes('gmail.com')) {
      finalPassword = finalPassword.replace(/\s+/g, '');
    }

    if (existingSmtp) {
      existingSmtp = await prisma.sMTPSettings.update({
        where: { id: existingSmtp.id },
        data: {
          host: (host || '').trim(),
          port: parseInt(port) || 587,
          username: (username || '').trim(),
          password: (finalPassword || '').trim(),
          encryption: (encryption || 'TLS').toUpperCase(),
          fromName: (fromName || 'GEO TRANSIT Support').trim(),
          fromEmail: (fromEmail || username).trim(),
        },
      });
    } else {
      existingSmtp = await prisma.sMTPSettings.create({
        data: {
          host: (host || '').trim(),
          port: parseInt(port) || 587,
          username: (username || '').trim(),
          password: (finalPassword || '').trim(),
          encryption: (encryption || 'TLS').toUpperCase(),
          fromName: (fromName || 'GEO TRANSIT Support').trim(),
          fromEmail: (fromEmail || username).trim(),
        },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: 'Updated SMTP Configuration',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'SMTP Settings saved successfully.',
    });
  } catch (error: any) {
    console.error('SMTP POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

