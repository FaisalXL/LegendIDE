import React, { useState, useRef, useEffect } from 'react';
import './AIChat.css';

const AIChat = ({ isVisible, onToggle, onFilesModified }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m Claude, your AI coding assistant with full project awareness. I can see all your project files, help you create new ones, edit existing code, debug issues, and answer questions with complete context of your codebase. What would you like to work on?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const messagesEndRef = useRef(null);

  // Initialize session and check connection
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/claude-agent/health');
        if (response.ok) {
          setIsConnected(true);
          setSessionId(`session_${Date.now()}`);
        }
      } catch (error) {
        console.error('Failed to connect to Claude Agent service:', error);
        setIsConnected(false);
      }
    };

    if (isVisible) {
      initializeSession();
    }
  }, [isVisible]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isLoading && isConnected) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        content: inputMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      const currentInput = inputMessage;
      setInputMessage('');
      setIsLoading(true);
      
      try {
        await handleClaudeAgentMessage(currentInput);
      } catch (error) {
        console.error('Error communicating with Claude Agent:', error);
        const errorResponse = {
          id: messages.length + 2,
          type: 'ai',
          content: 'Sorry, I encountered an error connecting to the Claude Agent service. Please make sure the service is running on port 3002.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClaudeAgentMessage = async (message) => {
    const response = await fetch('http://localhost:3002/api/claude-agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        session_id: sessionId,
        project_context: true
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Claude Agent');
    }

    const data = await response.json();
    
    const aiResponse = {
      id: messages.length + 2,
      type: 'ai',
      content: data.response,
      timestamp: new Date(),
      projectFiles: data.project_files,
      modifiedFiles: data.modified_files
    };
    
    setMessages(prev => [...prev, aiResponse]);
    
    // Notify parent component if files were modified
    if (data.modified_files && data.modified_files.length > 0 && onFilesModified) {
      onFilesModified(data.modified_files);
    }
    
    // Update project files if provided
    if (data.project_files) {
      setProjectFiles(data.project_files);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Also scroll when loading state changes
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="header-content">
          <h3>Claude Agent</h3>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <button className="close-button" onClick={onToggle}>×</button>
      </div>
      
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              {message.projectFiles && message.projectFiles.length > 0 && (
                <div className="project-files-info">
                  <small>📁 Analyzed {message.projectFiles.length} project files</small>
                </div>
              )}
              {message.modifiedFiles && message.modifiedFiles.length > 0 && (
                <div className="modified-files-info">
                  <small>✏️ Modified: {message.modifiedFiles.join(', ')}</small>
                </div>
              )}
            </div>
            <div className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="ai-chat-input">
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask me anything about your project..." : "Connecting to Claude Agent..."}
            disabled={!isConnected || isLoading}
            rows="1"
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isLoading || !isConnected}
            className="send-button"
          >
            Send
          </button>
        </div>
        
        {projectFiles.length > 0 && (
          <div className="project-context-info">
            <small>🔍 Project context: {projectFiles.length} files indexed</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;