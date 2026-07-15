import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/bankalfalah/callback
// Bank Alfalah redirects here after the user completes (or cancels) payment.
//
// Query params from Bank Alfalah:
//   PaymentID, ResponseCode, Reason, AuthToken, etc.
//
// Our custom params (added in session route):
//   userId, plan
//
// Flow:
// 1. Check ResponseCode — "000" or "0" means success
// 2. Grant VIP status to the user
// 3. Redirect to /?view=adult (now unlocked) or /?view=profile
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const plan = searchParams.get('plan') || 'monthly';
  const paymentId = searchParams.get('PaymentID');
  const responseCode = searchParams.get('ResponseCode');
  const reason = searchParams.get('Reason') || searchParams.get('reason') || '';

  // Determine payment status — Bank Alfalah uses "000" or "0" for success
  const isSuccess = responseCode === '000' || responseCode === '0' || responseCode === '00';
  const durationDays = plan === 'yearly' ? 365 : 30;

  if (!userId) {
    return NextResponse.redirect(new URL('/?view=home&payment=error&reason=missing_user', req.url));
  }

  if (!isSuccess) {
    // Payment failed or cancelled — redirect home with error
    const reasonParam = reason ? `&reason=${encodeURIComponent(reason)}` : '';
    return NextResponse.redirect(
      new URL(`/?view=home&payment=failed&code=${responseCode}${reasonParam}`, req.url),
    );
  }

  try {
    // Grant VIP status
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        vip: true,
        vipExpiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      },
    });

    if (!updated) {
      return NextResponse.redirect(new URL('/?view=home&payment=error&reason=user_not_found', req.url));
    }

    // Success — redirect to the Adult section (now unlocked) with success toast
    return NextResponse.redirect(
      new URL(`/?view=adult&payment=success&plan=${plan}&pid=${paymentId || ''}`, req.url),
    );
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.redirect(
      new URL(`/?view=home&payment=error&reason=${encodeURIComponent(err.message || 'db_error')}`, req.url),
    );
  }
}
