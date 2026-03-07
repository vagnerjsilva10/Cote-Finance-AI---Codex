import { NextResponse } from 'next/server';
import { setupUser } from '@/lib/auth-setup';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await setupUser({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      company_name: user.user_metadata?.company_name,
      phone: user.user_metadata?.phone,
      segment: user.user_metadata?.segment,
      operations_count:
        typeof user.user_metadata?.operations_count === 'number'
          ? user.user_metadata.operations_count
          : null,
      objective: user.user_metadata?.objective,
    });

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
    console.error('Auth Setup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
