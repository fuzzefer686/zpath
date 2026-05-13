'use client';

import { useMemo, useState } from 'react';
import { Send, Bot, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { buildCareerMatches } from '@/lib/matching-engine';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function ChatPage() {
  const { googleUser, userProfile, isLoading: isProfileLoading, errorMessage } = useUserProfile();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initialAssistantMessage = useMemo<ChatMessage | null>(() => {
    if (!userProfile) {
      return null;
    }

    const topMatch = buildCareerMatches(userProfile)[0];
    const firstName = googleUser?.user_metadata?.full_name?.split(' ')?.slice(-1)[0] ?? 'ban';

    return {
      role: 'ai',
      content: `Chao ${firstName}! Minh da doc ho so cua ban trong he thong. Hien nhom tinh cach cua ban la ${userProfile.personality} va huong phu hop nhat luc nay la ${topMatch?.title ?? 'mot lo trinh dang duoc cap nhat'}. Ban muon hoi ve nganh, truong hay cach cai thien ho so?`,
    };
  }, [googleUser, userProfile]);

  const visibleChatHistory =
    chatHistory.length === 0 && initialAssistantMessage ? [initialAssistantMessage] : chatHistory;

  const handleSendMessage = async () => {
    if (!message.trim() || !userProfile) return;

    // 1. Thêm tin nhắn của user vào màn hình
    const userMsg = message;
    const baseHistory = chatHistory.length === 0 && initialAssistantMessage ? [initialAssistantMessage] : chatHistory;

    setChatHistory([...baseHistory, { role: 'user', content: userMsg }]);
    setMessage('');
    setIsLoading(true);

    try {
      // 2. Gọi Backend API chúng ta vừa tạo
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          userProfile
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI Mentor dang ban.');
      }

      // 3. Hiển thị câu trả lời của AI
      setChatHistory(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isProfileLoading) {
    return <div className="max-w-3xl mx-auto p-8">Dang tai ho so cua ban...</div>;
  }

  if (errorMessage) {
    return <div className="max-w-3xl mx-auto p-8">{errorMessage}</div>;
  }

  if (!userProfile) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="mb-4">Ban chua co ho so de AI tu van.</p>
        <Link href="/profile" className="inline-flex bg-zpath-gradient text-white px-6 py-3 rounded-full font-semibold">
          Tao ho so
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-zpath-dark">AI Mentor</h1>
      </div>

      {/* Khung Chat */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Nơi hiển thị tin nhắn */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {visibleChatHistory.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zpath-primary text-white' : 'bg-zpath-gradient text-white'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-50 text-zpath-dark rounded-tr-none' : 'bg-gray-50 text-gray-800 rounded-tl-none whitespace-pre-line'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zpath-gradient text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          )}
        </div>

        {/* Khung nhập liệu */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Hỏi AI về ngành học, trường đại học..."
            className="flex-1 bg-gray-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-zpath-primary"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !message.trim()}
            className="bg-zpath-primary text-white p-4 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
