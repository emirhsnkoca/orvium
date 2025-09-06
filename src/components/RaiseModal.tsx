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
      text: "Hello! You can ask me anything about Rise Chain. How can I help you today?",
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

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Rise Chain offers powerful tools for developers and users with innovative blockchain technology.",
        "On our Orvium platform, you can find swap, transfer, security checks, and faucet services all in one place.",
        "Security is our priority in the Rise Chain ecosystem. All your transactions are protected with the highest security standards.",
        "Meet our smart tools developed to simplify your DeFi operations.",
        "As part of the Rise Chain community, you can benefit from constantly evolving and renewing features."
      ];

      const botMessage: Message = {
        id: Date.now() + 1,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
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
              placeholder="Rise Chain hakkında bir şeyler sorun..."
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