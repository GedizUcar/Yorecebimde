import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

type Message = { id: string; role: 'user' | 'bot'; content: string };
type HistoryEntry = { role: 'user' | 'model' | 'function'; content: string; name?: string };

export default function BotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        'Merhaba! Ben Yöre, Yörecebimde asistanı. Ne arıyorsun? Ürün ara, sepete ekle, sipariş tamamla — yardımcı olabilirim.',
    },
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const botMsgId = `b-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: botMsgId, role: 'bot', content: '' }]);
    setBusy(true);

    try {
      const cookie = await SecureStore.getItemAsync('yc.session').catch(() => null);
      const res = await fetch(`${API_BASE}/v1/bot/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'tr',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ message: text, history, locale: 'tr' }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let eventType = 'message';
          let data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) data = line.slice(6);
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (eventType === 'token' && parsed.text) {
              accumulated += parsed.text;
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === botMsgId ? { ...msg, content: accumulated } : msg,
                ),
              );
            } else if (eventType === 'done' && parsed.history) {
              setHistory(parsed.history);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                content:
                  'Üzgünüm, bot şu an cevap veremiyor. ' +
                  (e instanceof Error ? e.message : ''),
              }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                m.role === 'user' && { color: '#fff' },
              ]}
            >
              {m.content || (busy && m.role === 'bot' ? '···' : '')}
            </Text>
          </View>
        ))}
        {busy && (
          <View style={styles.botBubble}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Soru sor…"
          style={styles.input}
          editable={!busy}
          onSubmitEditing={send}
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={send}
          style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.5 }]}
          disabled={busy || !input.trim()}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfaf5' },
  messages: { padding: 12, gap: 8, paddingBottom: 16 },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#0a0a0a',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#f5f0e8',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#0a0a0a', lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopColor: '#e5e5e5',
    borderTopWidth: 1,
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fdfaf5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
