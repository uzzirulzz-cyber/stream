import { NextRequest, NextResponse } from 'next/server';
import { createPayment, isJazzCashConfigured, getJazzCashEnv } from '@/lib/jazzcash';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/jazzcash/session
// Creates a JazzCash payment request.
//
// Request body:
//   { plan: 'monthly' | 'yearly' }
//
// Returns:
//   { success, txnRefNo, apiUrl, postData } — frontend POSTs postData to apiUrl
//
// The frontend should render an auto-submitting form that POSTs `postData`
// to `apiUrl` (JazzCash hosted payment page).
export async function POST(req: NextRequest) {
  if (!isJazzCashConfigured()) {
    return NextResponse.json(
      {
        error: 'JazzCash not configured. Add JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL to .env',
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan || 'monthly'; // monthly ($8) | yearly ($80)
    // JazzCash primarily uses PKR. $8 ≈ PKR 2200 (rough conversion)
    const amount = plan === 'yearly' ? 22000 : 2200; // PKR
    const currency = 'PKR';

    // Ensure the user is logged in
    const session = await getSessionUser();
    if (!session.email) {
      return NextResponse.json(
        { error: 'Please log in or create an account first' },
        { status: 401 },
      );
    }

    const description = `VIP ${plan} subscription - Stream2Arena`;
    const billReference = `VIP${session.id.slice(-8)}${Date.now().toString().slice(-6)}`;

    const result = await createPayment(amount, currency, description, billReference);

    return NextResponse.json({
      success: true,
      txnRefNo: result.txnRefNo,
      apiUrl: result.apiUrl,
      postData: result.postData,
      amount,
      currency,
      plan,
      environment: getJazzCashEnv(),
      // Instructions for frontend: POST postData to apiUrl via auto-submitting form
      redirectMethod: 'POST',
      redirectUrl: result.apiUrl,
      redirectData: result.postData,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
