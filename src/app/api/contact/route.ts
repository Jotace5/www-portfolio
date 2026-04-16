import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Rate limiting (in-memory) ---
const rateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3; // 3 requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimit.set(ip, valid);

  if (valid.length >= RATE_LIMIT_MAX) {
    return true;
  }

  valid.push(now);
  rateLimit.set(ip, valid);
  return false;
}

// --- Validation ---
function validatePayload(body: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!body.email || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  if (body.message && typeof body.message === 'string' && body.message.length > 1000) {
    errors.message = 'Message must be 1000 characters or less.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    const body = await request.json();

    // 2. Honeypot check — if filled, return fake success silently
    if (body.honeypot) {
      return NextResponse.json(
        { success: true, message: 'Message sent successfully' },
        { status: 200 }
      );
    }

    // 3. Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 4. Server-side validation
    const { valid, errors } = validatePayload(body);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // 5. Send email via Resend
    const { error } = await resend.emails.send({
      from: `${body.name.trim()} <${process.env.CONTACT_EMAIL_FROM}>`,
      to: [process.env.CONTACT_EMAIL_TO!],
      replyTo: body.email.trim(),
      subject: `Portfolio contact from ${body.name.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #1A1A2E;">New message from your portfolio</h2>
          <p><strong>Name:</strong> ${body.name.trim()}</p>
          <p><strong>Email:</strong> ${body.email.trim()}</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="white-space: pre-wrap;">${body.message.trim()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
