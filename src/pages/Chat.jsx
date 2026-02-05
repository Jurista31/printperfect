import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import MessageBubble from '../components/chat/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      const convos = await base44.agents.listConversations({
        agent_name: 'print_support_agent'
      });
      
      if (convos && convos.length > 0) {
        const latest = convos[0];
        setConversations(convos);
        setCurrentConversation(latest);
        setMessages(latest.messages || []);
      } else {
        await createNewConversation();
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setInitializing(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConvo = await base44.agents.createConversation({
        agent_name: 'print_support_agent',
        metadata: {
          name: `Chat ${new Date().toLocaleDateString()}`,
          description: 'Print support conversation'
        }
      });
      setCurrentConversation(newConvo);
      setConversations([newConvo, ...conversations]);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start chat');
    }
  };

  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(
      currentConversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentConversation]);

  const handleSend = async () => {
    if (!input.trim() || loading || !currentConversation) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      await base44.agents.addMessage(currentConversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setInput(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Print Support AI</h1>
            <p className="text-sm text-slate-400">Ask me anything about 3D printing</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">How can I help?</h2>
              <p className="text-slate-400 mb-6">Ask me about print defects, settings, or troubleshooting</p>
              <div className="grid gap-3 max-w-md mx-auto">
                {[
                  "Why is my print warping?",
                  "Best settings for PETG?",
                  "How to fix layer lines?"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-t border-slate-800 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about defects, settings, or troubleshooting..."
              className="flex-1 min-h-[52px] max-h-32 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-[52px] px-6 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}