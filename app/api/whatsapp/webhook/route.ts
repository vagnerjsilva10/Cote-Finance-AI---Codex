import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getWhatsAppConfig,
  getWhatsAppVerifyToken,
  normalizeWhatsappPhone,
  sendWhatsAppTextMessage,
  verifyWhatsAppSignature,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TransactionType = 'INCOME' | 'EXPENSE';
type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'BOLETO' | 'OTHER';

type IncomingTextMessage = {
  id: string;
  from: string;
  body: string;
};

type ParsedFinancialCommand = {
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string;
  category: string;
};

const DEFAULT_HELP_MESSAGE =
  'Formato inválido. Envie, por exemplo: "gastei 50 mercado" ou "recebi 200 pix".';

const EXPENSE_KEYWORDS = ['gastei', 'paguei', 'despesa', 'comprei', 'debito', 'conta'];
const INCOME_KEYWORDS = ['recebi', 'ganhei', 'entrada', 'salario', 'faturei', 'credito'];
const PIX_IN_KEYWORDS = ['pix in', 'pixin', 'recebi pix'];
const PIX_OUT_KEYWORDS = ['pix out', 'pixout', 'enviei pix', 'paguei pix'];

const toAsciiLower = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const containsKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

function parseAmountFromText(text: string) {
  const sanitized = text.replace(/\s+/g, ' ');
  const match = sanitized.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) {
    return null;
  }

  const raw = match[1];
  const amount = Number(
    raw.includes(',') && raw.includes('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(',', '.')
  );

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return { amount, rawAmount: raw };
}

function inferCategory(type: TransactionType, description: string) {
  const text = toAsciiLower(description);

  if (text.includes('pix')) return 'PIX';
  if (text.includes('mercado') || text.includes('aliment') || text.includes('restaurante')) {
    return 'Alimentação';
  }
  if (
    text.includes('uber') ||
    text.includes('transporte') ||
    text.includes('onibus') ||
    text.includes('gasolina')
  ) {
    return 'Transporte';
  }
  if (text.includes('saude') || text.includes('farmacia') || text.includes('medico')) {
    return 'Saúde';
  }
  if (text.includes('educa') || text.includes('curso') || text.includes('faculdade')) {
    return 'Educação';
  }
  if (text.includes('lazer') || text.includes('cinema') || text.includes('show') || text.includes('bar')) {
    return 'Lazer';
  }
  if (
    text.includes('moradia') ||
    text.includes('aluguel') ||
    text.includes('condominio') ||
    text.includes('internet') ||
    text.includes('luz') ||
    text.includes('agua')
  ) {
    return 'Moradia';
  }
  if (text.includes('freela') || text.includes('freelance')) {
    return 'Freelance';
  }
  if (
    text.includes('invest') ||
    text.includes('tesouro') ||
    text.includes('cdb') ||
    text.includes('acoes') ||
    text.includes('fundo') ||
    text.includes('cripto')
  ) {
    return 'Investimentos';
  }
  if (type === 'INCOME') {
    return 'Salário';
  }

  return 'Outros';
}

function parseFinancialCommand(rawText: string): ParsedFinancialCommand | null {
  const normalizedText = toAsciiLower(rawText);
  const amountData = parseAmountFromText(normalizedText);
  if (!amountData) return null;

  let type: TransactionType = 'EXPENSE';
  let paymentMethod: PaymentMethod = 'OTHER';
  if (containsKeyword(normalizedText, PIX_OUT_KEYWORDS)) {
    type = 'EXPENSE';
    paymentMethod = 'PIX';
  } else if (containsKeyword(normalizedText, PIX_IN_KEYWORDS)) {
    type = 'INCOME';
    paymentMethod = 'PIX';
  } else if (containsKeyword(normalizedText, INCOME_KEYWORDS)) {
    type = 'INCOME';
    paymentMethod = normalizedText.includes('pix') ? 'PIX' : 'OTHER';
  } else if (containsKeyword(normalizedText, EXPENSE_KEYWORDS)) {
    type = 'EXPENSE';
    paymentMethod = normalizedText.includes('pix') ? 'PIX' : 'OTHER';
  } else if (normalizedText.includes('pix')) {
    type = normalizedText.includes('recebi') ? 'INCOME' : 'EXPENSE';
    paymentMethod = 'PIX';
  }

  const tokens = normalizedText.split(/\s+/);
  const amountTokenIndex = tokens.findIndex((token) => token.includes(amountData.rawAmount));
  const descriptionTokens = amountTokenIndex >= 0 ? tokens.slice(amountTokenIndex + 1) : [];
  const description = descriptionTokens.join(' ').replace(/^(de|do|da|no|na|em|para)\s+/i, '').trim();
  const finalDescription = description || (type === 'INCOME' ? 'Entrada via WhatsApp' : 'Despesa via WhatsApp');

  return {
    type,
    paymentMethod,
    amount: amountData.amount,
    description: finalDescription,
    category: inferCategory(type, finalDescription),
  };
}

function extractIncomingMessages(payload: any): IncomingTextMessage[] {
  const output: IncomingTextMessage[] = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of messages) {
        if (message?.type !== 'text') continue;
        if (typeof message?.from !== 'string') continue;
        if (typeof message?.text?.body !== 'string') continue;

        output.push({
          id: typeof message.id === 'string' ? message.id : `${message.from}-${Date.now()}`,
          from: message.from,
          body: message.text.body.trim(),
        });
      }
    }
  }

  return output;
}

async function processIncomingMessage(message: IncomingTextMessage) {
  const sender = normalizeWhatsappPhone(message.from);
  if (!sender) return;

  const workspace = await prisma.workspace.findFirst({
    where: {
      whatsapp_status: 'CONNECTED',
      OR: [
        { whatsapp_phone_number: sender },
        {
          whatsapp_phone_number: {
            endsWith: sender.slice(-11),
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      whatsapp_phone_number: true,
    },
  });

  if (!workspace) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Número não vinculado ao Cote Finance AI. Conecte seu WhatsApp na aba Integrações.',
    });
    return;
  }

  const parsed = parseFinancialCommand(message.body);
  if (!parsed) {
    await sendWhatsAppTextMessage({ to: sender, text: DEFAULT_HELP_MESSAGE });
    return;
  }

  const txResult = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findFirst({
      where: { workspace_id: workspace.id },
      orderBy: { id: 'asc' },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          workspace_id: workspace.id,
          name: 'Carteira Principal',
          type: 'CASH',
          balance: 0,
        },
      });
    }

    let category = await tx.category.findFirst({
      where: { name: parsed.category },
    });

    if (!category) {
      category = await tx.category.create({
        data: {
          name: parsed.category,
        },
      });
    }

    const duplicateWindowStart = new Date(Date.now() - 2 * 60 * 1000);
    const duplicated = await tx.transaction.findFirst({
      where: {
        workspace_id: workspace.id,
        wallet_id: wallet.id,
        type: parsed.type,
        payment_method: parsed.paymentMethod,
        amount: parsed.amount,
        description: parsed.description,
        date: { gte: duplicateWindowStart },
      },
      orderBy: { date: 'desc' },
    });

    if (duplicated) {
      return {
        duplicated: true,
        walletBalance: Number(wallet.balance),
      };
    }

    await tx.transaction.create({
      data: {
        workspace_id: workspace.id,
        wallet_id: wallet.id,
        category_id: category.id,
        type: parsed.type,
        payment_method: parsed.paymentMethod,
        amount: parsed.amount,
        date: new Date(),
        description: parsed.description,
        status: 'CONFIRMED',
      },
    });

    const balanceDelta = parsed.type === 'INCOME' ? parsed.amount : -parsed.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: balanceDelta,
        },
      },
    });

    return {
      duplicated: false,
      walletBalance: Number(updatedWallet.balance),
    };
  });

  if (txResult.duplicated) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Lançamento já registrado recentemente. Se quiser, envie com outra descrição.',
    });
    return;
  }

  await sendWhatsAppTextMessage({
    to: sender,
    text: `Lançamento confirmado: ${parsed.type === 'INCOME' ? 'entrada' : 'despesa'} de ${formatCurrency(parsed.amount)} em ${parsed.category}. Saldo da carteira: ${formatCurrency(txResult.walletBalance)}.`,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = getWhatsAppVerifyToken();

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error: any) {
    if (error instanceof Error && error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: error?.message || 'Webhook verify failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    const incomingMessages = extractIncomingMessages(body);
    if (incomingMessages.length > 0) {
      getWhatsAppConfig();
    }

    for (const message of incomingMessages) {
      try {
        await processIncomingMessage(message);
      } catch (error) {
        console.error('WhatsApp message processing error:', {
          messageId: message.id,
          from: message.from,
          error,
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    if (
      error instanceof Error &&
      (error.message === WHATSAPP_CONFIG_MISSING_ERROR ||
        error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR)
    ) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
