import 'server-only';

export async function synthesizeAssistantAudio(_text: string) {
  // Placeholder adapter: keep optional audio path ready for production providers.
  // Returning null means "audio unavailable", and caller should keep text-only reply.
  return null as { audioBuffer: Buffer; mimeType: string; filename?: string } | null;
}

