import { NextRequest, NextResponse } from 'next/server';
import { createHostedSession, isBankAlfalahConfigured } from '@/lib/bankalfalah';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/bankalfalah/session
// Creates a Bank Alfalah Hosted Session for VIP subscription payment.
//
// Request body:
//   { plan: 'monthly' | 'yearly' }
//
// Returns:
//   { success, authToken, returnURL, errorMessage } — frontend redirects to returnURL
//
// The returnURL points to /api/bankalfalah/callback which verifies the payment
// and grants VIP status after Bank Alfalah redirects back.
export async function POST(req: NextRequest) {
  if (!isBankAlfalahConfigured()) {
    return NextResponse.json(
      {
        error: 'Bank Alfalah not configured. Add BANKALFALAH_MERCHANT_ID, BANKALFALAH_STORE_ID, BANKALFALAH_USERNAME, BANKALFALAH_PASSWORD to .env',
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan || 'monthly'; // monthly ($8) | yearly ($80)
    const amount = plan === 'yearly' ? 8000 : 800; // in cents → Bank Alfalah expects major currency units
    const currency = 'USD';

    // Ensure the user is logged in — we need their ID to grant VIP after payment.
    const session = await getSessionUser();
    if (!session.email) {
      return NextResponse.json(
        { error: 'Please log in or create an account first' },
        { status: 401 },
      );
    }

    // Build the callback URL — Bank Alfalah redirects here after payment.
    // We pass the userId + plan via query params so the callback can grant VIP.
    const origin = req.headers.get('origin') || req.headers.get('host') || '';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const callbackUrl = `${protocol}://${origin}/api/bankalfalah/callback?userId=${session.id}&plan=${plan}`;

    const result = await createHostedSession(callbackUrl, amount, currency);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Failed to create payment session',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      authToken: result.authToken,
      returnURL: result.returnURL,
      amount,
      currency,
      plan,
      // Tell the frontend to redirect to the returnURL
      redirect: result.returnURL,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
