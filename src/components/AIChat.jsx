import React, { useState } from 'react';
import { FiSend, FiMessageSquare, FiX } from 'react-icons/fi';
import './AIChat.css';

const AIChat = ({ isVisible, onToggle }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI coding assistant. I can help you with code review, debugging, explanations, and more. What would you like to work on?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputMessage,
        timestamp: new Date()
      };
      
      setMessages([...messages, newMessage]);
      setInputMessage('');
      
      // Simulate AI response (placeholder for future Claude integration)
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          type: 'ai',
          content: 'This is a placeholder response. Claude integration will be added here to provide intelligent code assistance.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <FiMessageSquare className="ai-chat-icon" />
          <span>AI Assistant</span>
          <span className="ai-chat-badge">Claude</span>
        </div>
        <button className="ai-chat-close" onClick={onToggle}>
          <FiX />
        </button>
      </div>
      
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="ai-chat-input-container">
        <textarea
          className="ai-chat-input"
          placeholder="Ask me anything about your code..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={3}
        />
        <button 
          className="ai-chat-send"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim()}
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default AIChat;