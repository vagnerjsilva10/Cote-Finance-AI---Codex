import { permanentRedirect } from 'next/navigation';

type PoliticasAliasPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

function mapPolicyAlias(firstSegment: string | undefined) {
  if (!firstSegment) return '/politica-de-privacidade';

  const normalized = firstSegment.toLowerCase();

  if (normalized === 'privacidade' || normalized === 'politica-de-privacidade') {
    return '/politica-de-privacidade';
  }

  if (normalized === 'termos' || normalized === 'termos-de-uso') {
    return '/termos-de-uso';
  }

  if (normalized === 'cookies') {
    return '/cookies';
  }

  return '/politica-de-privacidade';
}

export default async function PoliticasAliasPage({ params }: PoliticasAliasPageProps) {
  const { slug } = await params;
  permanentRedirect(mapPolicyAlias(slug[0]));
}
