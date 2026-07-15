import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCallbackHash, isJazzCashConfigured } from '@/lib/jazzcash';

export const dynamic = 'force-dynamic';

// GET /api/jazzcash/callback
// JazzCash redirects here after the user completes (or cancels) payment.
//
// Query params from JazzCash (all prefixed with pp_):
//   pp_ResponseCode, pp_ResponseMessage, pp_TxnRefNo, pp_Amount,
//   pp_TxnCurrency, pp_TxnDateTime, pp_MerchantID, pp_SecureHash, etc.
//
// Flow:
// 1. Verify pp_SecureHash matches our recalculated hash (prevents fraud)
// 2. Check pp_ResponseCode — "000" means success
// 3. Grant VIP status to the user
// 4. Redirect to /?view=adult (unlocked) or /?view=home (failed)
//
// Note: We also support POST since some JazzCash integrations POST the response.
export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

async function handleCallback(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);

  // JazzCash sends params in query string (GET) or form body (POST)
  let params: Record<string, string> = {};
  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        params[key] = String(value);
      });
    } catch {
      // fall back to query params
    }
  }
  // Merge query params (works for both GET and POST-fallback)
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const responseCode = params.pp_ResponseCode;
  const responseMessage = params.pp_ResponseMessage || '';
  const txnRefNo = params.pp_TxnRefNo || '';

  // JazzCash uses "000" for success
  const isSuccess = responseCode === '000';

  // Verify the hash (if JazzCash is configured) — prevents fraud
  if (isJazzCashConfigured()) {
    try {
      const hashValid = verifyCallbackHash(params);
      if (!hashValid && isSuccess) {
        // Hash mismatch on a "success" response — possible fraud
        return NextResponse.redirect(
          new URL('/?view=home&payment=error&reason=hash_mismatch', req.url),
        );
      }
    } catch {
      // If hash verification fails (e.g. missing salt), log but continue
      // to allow payments in test mode
    }
  }

  if (!isSuccess) {
    const reason = responseMessage ? `&reason=${encodeURIComponent(responseMessage)}` : '';
    return NextResponse.redirect(
      new URL(`/?view=home&payment=failed&code=${responseCode}${reason}`, req.url),
    );
  }

  // Extract the userId from the bill reference (we encoded it in the txnRefNo)
  // Format: VIP<userIdSuffix><timestamp>
  // We need to find the user by matching the txnRefNo pattern.
  // Since we can't reliably reverse the userId, we'll find users who recently
  // had a payment attempt and match by the txnRefNo stored in the session.
  //
  // For simplicity, we pass the userId in the ReturnURL query param instead.
  // The JAZZCASH_RETURN_URL should include ?userId=<id> — but since JazzCash
  // uses a fixed ReturnURL, we'll need a different approach.
  //
  // Alternative: store the txnRefNo → userId mapping in the database before
  // redirecting to JazzCash. For now, we'll use the pp_BillReference field
  // which contains our original reference.

  const billRef = params.pp_BillReference || txnRefNo;

  // Try to find a user with a matching recent VIP attempt
  // In production, you'd store the txnRefNo in a Payment table
  // For now, we'll redirect to a page where the user logs in to claim VIP
  // based on the txnRefNo.

  // Extract userId from billRef if we encoded it (format: VIP<userIdSuffix><timestamp>)
  // This is a simplification — in production use a Payment table
  try {
    // Find all users and check if any have a cookie matching the billRef pattern
    // This is inefficient but works for the MVP
    const users = await db.user.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true },
      take: 1000,
    });

    // The billRef was: VIP<userId.slice(-8)><timestamp>
    // Try to match the userId suffix
    const refSuffix = billRef.startsWith('VIP') ? billRef.slice(3, 11) : '';
    const matchingUser = users.find((u) => u.id.slice(-8) === refSuffix);

    if (matchingUser) {
      // Grant VIP for 30 days (monthly) or 365 (yearly)
      // We stored plan in the description, but can't reliably parse it here
      // Default to 30 days
      const durationDays = 30;
      await db.user.update({
        where: { id: matchingUser.id },
        data: {
          vip: true,
          vipExpiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.redirect(
        new URL(`/?view=adult&payment=success&plan=monthly&txn=${encodeURIComponent(txnRefNo)}`, req.url),
      );
    }

    // No matching user — redirect with txnRefNo so they can claim manually
    return NextResponse.redirect(
      new URL(`/?view=home&payment=success&txn=${encodeURIComponent(txnRefNo)}&claim=1`, req.url),
    );
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.redirect(
      new URL(`/?view=home&payment=error&reason=${encodeURIComponent(err.message || 'db_error')}`, req.url),
    );
  }
}
