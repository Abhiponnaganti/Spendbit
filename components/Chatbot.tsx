'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { Button } from '@nextui-org/react';
import TransactionStore from '@/lib/transaction-store';

interface Message {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

const Chatbot = () => {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { 
            text: 'Hello! I\'m your Spendbit AI assistant. I can help you analyze your spending patterns, create budgets, and provide personalized financial advice. How can I assist you today?', 
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const newMessage: Message = { 
            text: input, 
            sender: 'user',
            timestamp: new Date()
        };
        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            // Get financial data from store
            const store = TransactionStore.getInstance();
            const financialData = store.getFinancialSummary();
            const allTransactions = store.getAllTransactions();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: input,
                    financialData: {
                        ...financialData,
                        recentTransactions: allTransactions.slice(0, 10)
                    }
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessages([...updatedMessages, { 
                    text: data.response, 
                    sender: 'bot',
                    timestamp: new Date()
                }]);
            } else {
                setMessages([...updatedMessages, { 
                    text: data.error || 'Sorry, something went wrong! Please try again.', 
                    sender: 'bot',
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages([...updatedMessages, { 
                text: 'Sorry, I\'m having trouble connecting right now. Please try again later.', 
                sender: 'bot',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }

        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!session) {
        return null; // Don't show chatbot if user is not logged in
    }

    return (
        <>
            {/* Chat Toggle Button */}
            {!isOpen && (
                <Button
                    isIconOnly
                    className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/25 w-14 h-14"
                    onPress={() => setIsOpen(true)}
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Spendbit Assistant</h3>
                                <p className="text-slate-400 text-xs">AI-powered financial advisor</p>
                            </div>
                        </div>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white"
                            onPress={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex items-start space-x-2 ${
                                    msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    msg.sender === 'bot' 
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                                        : 'bg-blue-500'
                                }`}>
                                    {msg.sender === 'bot' ? (
                                        <Bot className="h-3 w-3 text-white" />
                                    ) : (
                                        <User className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                    msg.sender === 'bot'
                                        ? 'bg-slate-700/50 text-white'
                                        : 'bg-blue-500 text-white'
                                }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    <p className="text-xs opacity-60 mt-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-3 w-3 text-white" />
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-700/50">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me about your finances..."
                                className="flex-1 bg-slate-700/50 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 border border-slate-600/50"
                                disabled={isLoading}
                            />
                            <Button
                                isIconOnly
                                size="sm"
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                onPress={handleSend}
                                isDisabled={!input.trim() || isLoading}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
