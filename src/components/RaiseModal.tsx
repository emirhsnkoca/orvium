import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface RaiseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RaiseModal: React.FC<RaiseModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm the Rise Chain AI assistant. I can answer your questions about the Rise Chain blockchain platform, SDKs, DeFi tools, security features, and the entire ecosystem. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const searchRiseChainInfo = async (query: string): Promise<string> => {
    try {
      // Rise Chain web sitesinden bilgi çek
      const response = await fetch(`https://blog.risechain.com/tag/research/`);
      if (response.ok) {
        const html = await response.text();
        // Basit bir HTML parse (gerçek projede daha gelişmiş parser kullan)
        const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return textContent.substring(0, 2000); // İlk 2000 karakter
      }
    } catch (error) {
      console.log('Web scraping failed, using local knowledge');
    }
    return '';
  };

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return "API key bulunamadı. Lütfen VITE_GEMINI_API_KEY environment variable'ını ayarlayın.";
    }

    // Rise Chain web sitesinden güncel bilgi çek
    const webInfo = await searchRiseChainInfo(prompt);

    const systemPrompt = `You are an expert AI assistant specialized in Rise Chain. You only answer questions about Rise Chain, blockchain technology, DeFi, SDK, smart contracts and related topics.

What you need to know about Rise Chain:
- Rise Chain is a modern blockchain platform focusing on Layer 2 solutions
- Offers swap, transfer, security checks and faucet services through the Orvium platform
- Security-focused ecosystem with based sequencing technology
- Developer-friendly SDKs available
- Provides smart tools for DeFi operations
- Has testnet faucet hub
- Multi-signature wallet support
- Phishing detection system
- Advanced bulk transfer features

Advanced Rise Chain Technologies:
- Based Sequencing: Moves rollup sequencing directly onto Ethereum blocks for main-chain security
- Parallel EVM (PEVM): High-performance parallel execution virtual machine
- Hybrid Rollups: Combines optimistic performance with ZK security
- Preconfirmation Technology: Fast and predictable transaction confirmations
- Real-time blockchain capabilities with instant randomness
- Advanced state management systems
- Support for Ethereum's Glamsterdam upgrade (2026)
- Bonded gateway architecture for enhanced security

IMPORTANT: Always respond in the SAME LANGUAGE that the user writes their question in. If they write in Turkish, respond in Turkish. If they write in English, respond in English. If they write in another language, respond in that language.

If the question is not related to Rise Chain, politely mention that you can only help with Rise Chain topics.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${webInfo ? `Recent Rise Chain Information:\n${webInfo}\n\n` : ''}Kullanıcı sorusu: ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Üzgünüm, bir hata oluştu.";
    } catch (error) {
      console.error('Gemini API Error:', error);
      return "Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      const aiResponse = await callGeminiAPI(currentInput);
      
      const botMessage: Message = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-[#1A1A2E]/95 to-[#0F0F1A]/95 backdrop-blur-lg border border-[#8A2BE2]/30 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl shadow-[#8A2BE2]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#8A2BE2]/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] rounded-lg">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-rajdhani">
                rAIse
              </h3>
              <p className="text-sm text-gray-400 font-poppins">Rise AI Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-300 p-2 hover:bg-[#8A2BE2]/20 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`p-2 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-[#FF00FF] to-[#8A2BE2]' 
                    : 'bg-[#8A2BE2]/20'
                }`}>
                  {message.sender === 'user' ? (
                    <User size={16} className="text-white" />
                  ) : (
                    <Bot size={16} className="text-[#BF40BF]" />
                  )}
                </div>
                <div className={`p-4 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-[#FF00FF]/20 to-[#8A2BE2]/20 border border-[#FF00FF]/30'
                    : 'bg-[#8A2BE2]/10 border border-[#8A2BE2]/20'
                }`}>
                  <p className="text-white font-poppins">{message.text}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[#8A2BE2]/20 rounded-lg">
                  <Bot size={16} className="text-[#BF40BF]" />
                </div>
                <div className="p-4 rounded-2xl bg-[#8A2BE2]/10 border border-[#8A2BE2]/20">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-[#BF40BF] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#BF40BF] rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-[#BF40BF] rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[#8A2BE2]/20">
          <div className="flex space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about Rise Chain..."
              className="flex-1 bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#BF40BF] focus:ring-2 focus:ring-[#8A2BE2]/20 transition-all duration-300 font-poppins"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] hover:from-[#BF40BF] hover:to-[#FF00FF] text-white p-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaiseModal;