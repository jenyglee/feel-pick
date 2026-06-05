import { ChatPage } from '@/views/chat';

export const dynamic = 'force-dynamic';

// Next 16: 동적 라우트 params는 Promise → await 후 사용.
export default async function Chat({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ChatPage conversationId={conversationId} />;
}
