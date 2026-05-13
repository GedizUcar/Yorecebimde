import { ChatView } from '@/components/chat-view';

export default function SellerMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Mesajlar</h1>
        <p className="text-sm text-ink-muted80">Müşterilerinizle iletişimde kalın.</p>
      </div>
      <ChatView scope="seller" />
    </div>
  );
}

export const metadata = { title: 'Mesajlar', robots: { index: false } };
