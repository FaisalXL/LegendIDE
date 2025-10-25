import React, { useState } from 'react';
import { FiSend, FiMessageSquare, FiX, FiLoader, FiTerminal, FiCloud } from 'react-icons/fi';
import './AIChat.css';

const AIChat = ({ isVisible, onToggle }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m Claude, your AI coding assistant. I can help you with:\n\n• Creating and editing files\n• Code review and debugging\n• Explaining code concepts\n• Providing coding suggestions\n• Project assistance\n\nChoose your mode:\n• **API Mode**: Standard chat with file guidance\n• **CLI Mode**: Direct file operations with interactive permissions',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [useCliMode, setUseCliMode] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [pendingPermission, setPendingPermission] = useState(null);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isLoading) {
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
        if (useCliMode) {
          await handleCliMessage(currentInput);
        } else {
          await handleApiMessage(currentInput);
        }
      } catch (error) {
        console.error('Error communicating with Claude:', error);
        const errorResponse = {
          id: messages.length + 2,
          type: 'ai',
          content: 'Sorry, I encountered an error. Please make sure the API key is configured and try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApiMessage = async (message) => {
    const response = await fetch('http://localhost:3001/api/claude-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        conversationHistory: conversationHistory
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Claude API');
    }

    const data = await response.json();
    
    const aiResponse = {
      id: messages.length + 2,
      type: 'ai',
      content: data.response,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, aiResponse]);
    setConversationHistory(data.conversationHistory);
  };

  const handleCliMessage = async (message) => {
    const response = await fetch('http://localhost:3001/api/claude-cli-interactive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Claude CLI');
    }

    const data = await response.json();
    
    if (data.type === 'permission_request') {
      // Handle permission request
      setPendingPermission({
        sessionId: data.sessionId,
        question: data.question,
        output: data.output
      });
      
      const permissionMessage = {
        id: messages.length + 2,
        type: 'permission',
        content: data.question,
        sessionId: data.sessionId,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, permissionMessage]);
      setActiveSession(data.sessionId);
    } else if (data.type === 'completed') {
      // Handle completed response
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: data.output,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setActiveSession(null);
      setPendingPermission(null);
    }
  };

  const handlePermissionResponse = async (response) => {
    if (!pendingPermission) return;
    
    setIsLoading(true);
    
    try {
      const apiResponse = await fetch('http://localhost:3001/api/claude-cli-interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: pendingPermission.sessionId,
          response: response
        }),
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to send permission response');
      }

      // Add user's response to chat
      const userResponse = {
        id: messages.length + 1,
        type: 'user',
        content: response === 'y' ? 'Yes' : 'No',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userResponse]);
      
      // Start polling for continued output from Claude CLI
      pollForContinuedOutput(pendingPermission.sessionId);
      
    } catch (error) {
      console.error('Error sending permission response:', error);
      const errorResponse = {
        id: messages.length + 1,
        type: 'ai',
        content: 'Error sending permission response. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsLoading(false);
      setPendingPermission(null);
    }
  };

  const pollForContinuedOutput = async (sessionId, attempts = 0) => {
    const maxAttempts = 30; // 30 seconds max
    
    if (attempts >= maxAttempts) {
      setIsLoading(false);
      setPendingPermission(null);
      const timeoutResponse = {
        id: messages.length + 1,
        type: 'ai',
        content: 'Session timed out. Claude CLI may still be running in the background.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, timeoutResponse]);
      return;
    }

    try {
      // Check if the session is still active and get any new output
      const response = await fetch(`http://localhost:3001/api/claude-cli-session/${sessionId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.type === 'completed') {
          // Session completed, show final output
          const aiResponse = {
            id: messages.length + 1,
            type: 'ai',
            content: data.output || 'Task completed.',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, aiResponse]);
          setActiveSession(null);
          setPendingPermission(null);
          setIsLoading(false);
          return;
        } else if (data.type === 'permission_request') {
          // Another permission request
          setPendingPermission({
            sessionId: sessionId,
            question: data.question,
            output: data.output
          });
          
          const permissionMessage = {
            id: messages.length + 1,
            type: 'permission',
            content: data.question,
            sessionId: sessionId,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, permissionMessage]);
          setIsLoading(false);
          return;
        }
      }
      
      // Continue polling
      setTimeout(() => {
        pollForContinuedOutput(sessionId, attempts + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error polling for continued output:', error);
      setIsLoading(false);
      setPendingPermission(null);
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
      
      {/* Mode Toggle */}
      <div className="ai-chat-mode-toggle">
        <button 
          className={`mode-button ${!useCliMode ? 'active' : ''}`}
          onClick={() => setUseCliMode(false)}
          disabled={isLoading || pendingPermission}
        >
          <FiCloud />
          <span>API Mode</span>
        </button>
        <button 
          className={`mode-button ${useCliMode ? 'active' : ''}`}
          onClick={() => setUseCliMode(true)}
          disabled={isLoading || pendingPermission}
        >
          <FiTerminal />
          <span>CLI Mode</span>
        </button>
      </div>
      
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
            {message.type === 'permission' && (
              <div className="permission-buttons">
                <button 
                  className="permission-btn yes-btn"
                  onClick={() => handlePermissionResponse('y')}
                  disabled={isLoading}
                >
                  Yes
                </button>
                <button 
                  className="permission-btn no-btn"
                  onClick={() => handlePermissionResponse('n')}
                  disabled={isLoading}
                >
                  No
                </button>
              </div>
            )}
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="ai-chat-input-container">
        <textarea
          className="ai-chat-input"
          placeholder={useCliMode ? "Ask Claude CLI to create/modify files..." : "Ask me anything about your code..."}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={3}
          disabled={isLoading || pendingPermission}
        />
        <button 
          className="ai-chat-send"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading || pendingPermission}
        >
          {isLoading ? <FiLoader className="loading-spinner" /> : <FiSend />}
        </button>
      </div>
    </div>
  );
};

export default AIChat;