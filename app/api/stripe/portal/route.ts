import { NextResponse } from 'next/server';
import {
  getStripe,
  STRIPE_SECRET_KEY_MISSING_ERROR,
  STRIPE_NOT_CONFIGURED_RESPONSE,
} from '@/lib/stripe';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { ensureStripeCustomer } from '@/lib/server/stripe-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const userId = context.userId;

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer({
      userId,
      email: context.email,
    });

    const requestUrl = new URL(req.url);
    const baseUrl = process.env.APP_URL || requestUrl.origin;
    const returnUrl = new URL('/app', baseUrl).toString();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId,
      type: 'stripe.portal_opened',
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === STRIPE_SECRET_KEY_MISSING_ERROR) {
      return NextResponse.json(
        { error: STRIPE_NOT_CONFIGURED_RESPONSE },
        { status: 500 }
      );
    }

    console.error('Stripe Portal Error:', error);
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to create portal session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
