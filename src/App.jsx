import { useState, useRef, useCallback } from 'react';
import SplitPane from '@uiw/react-split';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import FileExplorer from './components/FileExplorer';
import LanguageTabs from './components/LanguageTabs';
import AIChat from './components/AIChat';
import Navbar from './components/Navbar';
import { Box, CssBaseline, ThemeProvider, createTheme, IconButton } from '@mui/material';
import { FiTerminal, FiMessageSquare, FiX } from 'react-icons/fi';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [isAIChatVisible, setIsAIChatVisible] = useState(true);
  const terminalRef = useRef();
  const fileExplorerRef = useRef();
  
  // Project root path - this should match the server's working directory
  const projectRoot = '/Users/faisal./Documents/trae_projects/Replitclone';

  // Debounced save function
  const saveFileToServer = useCallback(async (filePath, content) => {
    try {
      const response = await fetch('http://localhost:3001/api/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: filePath,
          content: content
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('Failed to save file:', result.error);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  }, []);

  // Debounce timer ref
  const saveTimeoutRef = useRef();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCodeChange = (newCode) => {
    if (tabs.length > 0) {
      const newTabs = [...tabs];
      newTabs[activeTab].code = newCode;
      setTabs(newTabs);

      // Auto-save with debouncing (save after 1 second of no changes)
      const currentTab = newTabs[activeTab];
      if (currentTab.path) {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        saveTimeoutRef.current = setTimeout(() => {
          saveFileToServer(currentTab.path, newCode);
        }, 1000); // 1 second delay
      }
    }
  };

  const handleFileSelect = (file) => {
    // Check if file is already open in a tab
    const existingTabIndex = tabs.findIndex(tab => tab.path === file.path);
    
    if (existingTabIndex !== -1) {
      // Switch to existing tab
      setActiveTab(existingTabIndex);
    } else {
      // Create new tab
      const newTab = {
        name: file.name,
        path: file.path,
        language: file.language,
        code: file.content
      };
      
      const newTabs = [...tabs, newTab];
      setTabs(newTabs);
      setActiveTab(newTabs.length - 1);
    }
  };

  const handleCloseTab = (tabIndex) => {
    const newTabs = tabs.filter((_, index) => index !== tabIndex);
    setTabs(newTabs);
    
    if (newTabs.length === 0) {
      setActiveTab(0);
    } else if (activeTab >= tabIndex && activeTab > 0) {
      setActiveTab(activeTab - 1);
    } else if (activeTab >= newTabs.length) {
      setActiveTab(newTabs.length - 1);
    }
  };

  const handleRun = () => {
    const socket = terminalRef.current?.socket;
    if (socket && tabs.length > 0) {
      const currentTab = tabs[activeTab];
      if (currentTab.path) {
        socket.emit('execute:code', { filePath: currentTab.path });
      } else {
        console.error('No file path available for execution');
      }
    }
  };

  // Navbar handlers
  const handleNewFile = async (fileName) => {
    try {
      const filePath = `${projectRoot}/dev/codeforces/${fileName}`;
      const response = await fetch('http://localhost:3001/api/create-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: filePath,
          content: ''
        }),
      });

      const result = await response.json();
      if (response.ok) {
        // Refresh file explorer
        if (fileExplorerRef.current?.refreshFiles) {
          fileExplorerRef.current.refreshFiles();
        }
        
        // Open the new file in editor
        const fileExtension = fileName.split('.').pop();
        const language = getLanguageFromExtension(fileExtension);
        
        const newTab = {
          name: fileName,
          path: filePath,
          language: language,
          code: ''
        };
        
        const newTabs = [...tabs, newTab];
        setTabs(newTabs);
        setActiveTab(newTabs.length - 1);
      } else {
        console.error('Failed to create file:', result.error);
        alert(`Failed to create file: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Error creating file');
    }
  };

  const handleNewFolder = async (folderName) => {
    try {
      const folderPath = `${projectRoot}/dev/codeforces/${folderName}`;
      const response = await fetch('http://localhost:3001/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderPath: folderPath
        }),
      });

      const result = await response.json();
      if (response.ok) {
        // Refresh file explorer
        if (fileExplorerRef.current?.refreshFiles) {
          fileExplorerRef.current.refreshFiles();
        }
      } else {
        console.error('Failed to create folder:', result.error);
        alert(`Failed to create folder: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder');
    }
  };

  const handleOpenFile = () => {
    // For now, just focus on the file explorer
    // In a real implementation, this could open a file dialog
    console.log('Open file clicked - focus on file explorer');
  };

  const handleFilesModified = (modifiedFiles) => {
    console.log('Files modified by Claude agent:', modifiedFiles);
    // Refresh file explorer when Claude agent modifies files
    if (fileExplorerRef.current?.refreshFiles) {
      fileExplorerRef.current.refreshFiles();
    }
  };

  // Helper function to determine language from file extension
  const getLanguageFromExtension = (extension) => {
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return languageMap[extension] || 'plaintext';
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e' }}>
        {/* Navbar */}
        <Navbar 
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onOpenFile={handleOpenFile}
        />
        
        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Panel - File Explorer */}
          <Box sx={{ width: '250px', minWidth: '200px', borderRight: '1px solid #333' }}>
            <FileExplorer ref={fileExplorerRef} onRun={handleRun} onFileSelect={handleFileSelect} />
          </Box>

          {/* Center Panel - Code Editor with Terminal at Bottom */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '400px' }}>
            {/* Top Bar with Toggle Buttons */}
            <Box sx={{ 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              px: 2,
              borderBottom: '1px solid #333',
              bgcolor: '#252526'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                  sx={{ color: isTerminalVisible ? '#007acc' : '#888' }}
                >
                  <FiTerminal />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setIsAIChatVisible(!isAIChatVisible)}
                  sx={{ color: isAIChatVisible ? '#007acc' : '#888' }}
                >
                  <FiMessageSquare />
                </IconButton>
              </Box>
            </Box>

            {/* Code Editor Area with Terminal */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Editor Section */}
              <Box sx={{ 
                flex: isTerminalVisible ? '1 1 70%' : '1 1 100%', 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0
              }}>
                {tabs.length > 0 ? (
                  <>
                    <LanguageTabs 
                      tabs={tabs} 
                      activeTab={activeTab} 
                      onChange={handleTabChange}
                      onCloseTab={handleCloseTab}
                    />
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                      <Editor 
                        value={tabs[activeTab].code} 
                        onChange={handleCodeChange}
                        language={tabs[activeTab].language}
                      />
                    </Box>
                  </>
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: '#1e1e1e',
                    color: 'white'
                  }}>
                    Select a file from the explorer to start editing
                  </Box>
                )}
              </Box>
              
              {/* Terminal Section */}
              {isTerminalVisible && (
                <Box sx={{ 
                  flex: '0 0 30%', 
                  borderTop: '1px solid #333',
                  minHeight: '200px'
                }}>
                  <Terminal ref={terminalRef} />
                </Box>
              )}
            </Box>
          </Box>

          {/* Right Panel - AI Chat */}
          {isAIChatVisible && (
            <Box sx={{ width: '350px', minWidth: '300px' }}>
              <AIChat 
                isVisible={isAIChatVisible} 
                onToggle={() => setIsAIChatVisible(false)} 
                onFilesModified={handleFilesModified}
              />
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
