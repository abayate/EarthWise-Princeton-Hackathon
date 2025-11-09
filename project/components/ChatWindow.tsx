'use client';

import { useState } from 'react';
import { Send, Bot, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  planItem?: boolean;
  planIndex?: number;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your EarthWise Coach. I'm here to help you build sustainable habits and improve your wellness. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: "Thanks for your message! I'm here to help you with eco-friendly habits and wellness tips.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  const handleGeneratePlan = async () => {
    const res = await fetch('/api/nova/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: ['reduce plastic', 'lower energy use'],
        charities: ['Ocean Cleanup'],
      }),
    });
    const data = await res.json();
    if (Array.isArray(data.plan)) {
      setMessages((prev) => [
        ...prev,
        ...data.plan.map((item: string, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          role: 'assistant' as const,
          content: item,
          timestamp: new Date(),
          planItem: true,
          planIndex: idx + 1,
        })),
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-slate-200' : 'bg-green-100'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-slate-600" />
                  ) : message.planItem ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Bot className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div
                  className={`flex-1 max-w-[80%] ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : message.planItem
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {message.planItem ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">{message.planIndex}.</span>
                        <span className="text-sm">{message.content}</span>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-slate-200">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask your coach anything..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon">
              <Send className="w-4 h-4" />
            </Button>
            <Button onClick={handleGeneratePlan} variant="outline">
              Generate plan with Amazon Nova (mock)
            </Button>
          </div>
        </div>
      </div>
  );
}
