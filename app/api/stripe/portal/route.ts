import { NextResponse } from 'next/server';
import {
  getStripe,
  STRIPE_SECRET_KEY_MISSING_ERROR,
  STRIPE_NOT_CONFIGURED_RESPONSE,
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfilePlan = 'FREE' | 'PRO' | 'PREMIUM';

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|column .* does not exist/i.test(message);
};

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const userId = context.userId;

    const stripe = getStripe();

    let profile: { stripe_customer_id: string | null; plan: string | null } | null = null;
    try {
      profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        select: {
          stripe_customer_id: true,
          plan: true,
        },
      });
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }

    let customerId = profile?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.email ?? undefined,
        metadata: {
          userId,
        },
      });

      customerId = customer.id;

      try {
        await prisma.profile.upsert({
          where: { user_id: userId },
          update: {
            stripe_customer_id: customerId,
          },
          create: {
            user_id: userId,
            stripe_customer_id: customerId,
            plan: ((profile?.plan as ProfilePlan | null) || 'FREE') as ProfilePlan,
          },
        });
      } catch (error) {
        if (!isMissingTableError(error)) {
          throw error;
        }
      }
    }

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
