import { useState, useRef, useCallback } from 'react';
import SplitPane from '@uiw/react-split';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import FileExplorer from './components/FileExplorer';
import LanguageTabs from './components/LanguageTabs';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const terminalRef = useRef();

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
      socket.emit('execute:code', { code: currentTab.code, language: currentTab.language });
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e' }}>
        <SplitPane style={{ height: '100%', position: 'relative' }}>
          <div style={{ minWidth: 200, width: '15%' }}>
            <FileExplorer onRun={handleRun} onFileSelect={handleFileSelect} />
          </div>
          <SplitPane style={{ width: '85%' }}>
            <div style={{ width: '60%', minWidth: 300 }}>
              {tabs.length > 0 ? (
                <>
                  <LanguageTabs 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    onChange={handleTabChange}
                    onCloseTab={handleCloseTab}
                  />
                  <Editor 
                    value={tabs[activeTab].code} 
                    onChange={handleCodeChange}
                    language={tabs[activeTab].language}
                  />
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
            </div>
            <div style={{ width: '40%', minWidth: 300 }}>
              <Terminal ref={terminalRef} />
            </div>
          </SplitPane>
        </SplitPane>
      </Box>
    </ThemeProvider>
  );
}

export default App;
