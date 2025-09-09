import React, { useState, useRef, useEffect } from 'react';
import { getAiChatResponse } from '../services/mockApi';
import { ChatMessage } from '../types';

// Let TypeScript know that 'marked' is available on the window object
declare const marked: any;

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, loading]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && messages.length === 0) {
             setMessages([{ sender: 'AI', text: "Hello! I'm your AI assistant. How can I help you today?" }]);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { sender: 'USER', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const response = await getAiChatResponse(input, messages);
            const aiMessage: ChatMessage = { sender: 'AI', text: response.reply };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Sorry, I encountered an error. Please try again.';
            setError(errorMessage);
            setMessages(prev => [...prev, { sender: 'AI', text: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className={`fixed bottom-0 right-0 m-6 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 scale-90 invisible' : 'opacity-100 scale-100 visible'}`}>
                <button
                    onClick={handleToggle}
                    className="bg-teal-500 text-white rounded-full p-4 shadow-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    aria-label="Open AI Assistant"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V10a2 2 0 012-2h8z" /></svg>
                </button>
            </div>

            <div className={`fixed bottom-0 right-0 mb-6 mx-6 transition-all duration-300 ease-in-out z-20 ${isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-90 invisible'}`}>
                <div className="w-96 h-[32rem] bg-white rounded-lg shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 bg-teal-500 text-white rounded-t-lg">
                        <h3 className="font-bold text-lg">AI Assistant</h3>
                        <button onClick={handleToggle} className="hover:bg-teal-600 p-1 rounded-full">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-3">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender === 'USER' ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                       {msg.sender === 'AI' && typeof marked !== 'undefined' ? (
                                            <div
                                                className="ai-message-content"
                                                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
                                            />
                                        ) : (
                                            <p>{msg.text}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 flex items-center space-x-2">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200">
                        <form onSubmit={handleSendMessage} className="flex space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="bg-teal-500 text-white rounded-full p-3 hover:bg-teal-600 disabled:bg-teal-300 disabled:cursor-not-allowed flex-shrink-0"
                                aria-label="Send message"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
             <style>{`
                .ai-message-content p { margin-bottom: 0.5rem; }
                .ai-message-content p:last-child { margin-bottom: 0; }
                .ai-message-content a { color: #0d9488; text-decoration: underline; }
                .ai-message-content a:hover { color: #0f766e; }
                .ai-message-content h1, .ai-message-content h2, .ai-message-content h3 { font-weight: bold; margin-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
                .ai-message-content h1 { font-size: 1.1rem; }
                .ai-message-content h2 { font-size: 1rem; }
                .ai-message-content h3 { font-size: 0.9rem; }
                .ai-message-content ul, .ai-message-content ol { padding-left: 1.25rem; margin-bottom: 0.5rem; }
                .ai-message-content ul { list-style-type: disc; }
                .ai-message-content ol { list-style-type: decimal; }
                .ai-message-content li { margin-bottom: 0.25rem; }
                .ai-message-content strong { font-weight: 700; }
                .ai-message-content em { font-style: italic; }
                .ai-message-content code { background-color: #e5e7eb; padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.85em; }
            `}</style>
        </>
    );
};

export default Chatbot;