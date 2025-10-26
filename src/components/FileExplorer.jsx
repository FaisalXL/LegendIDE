import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  Folder as FolderIcon, 
  InsertDriveFile as FileIcon,
  ExpandLess,
  ExpandMore,
  PlayArrow,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const FileExplorer = forwardRef(function FileExplorer({ onRun, onFileSelect }, ref) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const fetchFiles = async (path = '') => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/files${path ? `?path=${encodeURIComponent(path)}` : ''}`);
      const data = await response.json();
      setFiles(data.files);
      setCurrentPath(data.currentPath);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Default to dev/codeforces directory
    const defaultPath = '';
    fetchFiles(defaultPath);
  }, []);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshFiles: () => fetchFiles(currentPath)
  }));

  const handleFileClick = async (file) => {
    if (file.isDirectory) {
      fetchFiles(file.path);
    } else {
      // Handle file selection
      try {
        const response = await fetch(`http://localhost:3001/api/file-content?path=${encodeURIComponent(file.path)}`);
        const data = await response.json();
        
        if (onFileSelect) {
          onFileSelect({
            name: file.name,
            path: file.path,
            content: data.content,
            language: getLanguageFromExtension(file.name)
          });
        }
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
  };

  const getLanguageFromExtension = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      // JavaScript/TypeScript
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'coffee':
        return 'coffeescript';
      
      // Python
      case 'py':
      case 'pyw':
        return 'python';
      
      // Java and JVM languages
      case 'java':
        return 'java';
      case 'kt':
      case 'kts':
        return 'kotlin';
      case 'scala':
        return 'scala';
      case 'clj':
      case 'cljs':
        return 'clojure';
      
      // C/C++
      case 'c':
        return 'c';
      case 'cpp':
      case 'cxx':
      case 'cc':
      case 'h':
      case 'hpp':
      case 'hxx':
        return 'cpp';
      
      // C#
      case 'cs':
        return 'csharp';
      
      // Systems programming
      case 'rs':
        return 'rust';
      case 'go':
        return 'go';
      case 'swift':
        return 'swift';
      case 'dart':
        return 'dart';
      
      // Scripting languages
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'pl':
      case 'pm':
        return 'perl';
      case 'lua':
        return 'lua';
      case 'r':
        return 'r';
      
      // Functional languages
      case 'hs':
      case 'lhs':
        return 'haskell';
      case 'ex':
      case 'exs':
        return 'elixir';
      case 'erl':
      case 'hrl':
        return 'erlang';
      
      // Shell scripts
      case 'sh':
        return 'shell';
      case 'bash':
        return 'bash';
      case 'ps1':
        return 'powershell';
      case 'bat':
      case 'cmd':
        return 'batch';
      
      // Web technologies
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'xml':
        return 'xml';
      case 'svg':
        return 'xml';
      
      // Data formats
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'toml':
        return 'toml';
      case 'ini':
        return 'ini';
      case 'csv':
        return 'csv';
      
      // Database
      case 'sql':
        return 'sql';
      
      // Documentation and markup
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'tex':
        return 'latex';
      case 'rst':
        return 'restructuredtext';
      
      // Configuration
      case 'dockerfile':
        return 'dockerfile';
      case 'gitignore':
        return 'gitignore';
      
      // Default
      default:
        return 'text';
    }
  };

  const goBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath) {
      fetchFiles(parentPath);
    }
  };

  const handleNewFile = () => {
    setNewFileDialogOpen(true);
    setNewFileName('');
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      return;
    }

    // Use simple path concatenation instead of path.join for browser compatibility
    const filePath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    
    try {
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
        // Refresh the file list
        fetchFiles(currentPath);
        setNewFileDialogOpen(false);
        setNewFileName('');
        
        // Automatically open the new file in the editor
        const fileExtension = newFileName.split('.').pop();
        const language = getLanguageFromExtension(newFileName);
        onFileSelect({
          name: newFileName,
          path: filePath,
          content: '',
          language: language
        });
      } else {
        alert(result.error || 'Failed to create file');
      }
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Failed to create file');
    }
  };

  const handleDialogClose = () => {
    setNewFileDialogOpen(false);
    setNewFileName('');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#2d2d2d', color: 'white' }}>
      <Box sx={{ p: 1, borderBottom: '1px solid #444' }}>
        <Typography variant="h6" sx={{ fontSize: '14px', mb: 1 }}>
          File Explorer
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onRun}
          startIcon={<PlayArrow />}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
        >
          Run
        </Button>
        {currentPath && (
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button 
              onClick={goBack}
              size="small"
              sx={{ color: 'white', fontSize: '12px' }}
            >
              ← Back
            </Button>
            <Button 
              onClick={handleNewFile}
              size="small"
              startIcon={<AddIcon />}
              sx={{ color: 'white', fontSize: '12px' }}
            >
              New File
            </Button>
            <Button 
              onClick={() => fetchFiles(currentPath)}
              size="small"
              startIcon={<RefreshIcon />}
              sx={{ color: 'white', fontSize: '12px' }}
            >
              Refresh
            </Button>
          </Box>
        )}
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Typography sx={{ p: 2, fontSize: '12px' }}>Loading...</Typography>
        ) : (
          <List dense>
            {files.map((file, index) => (
              <ListItem 
                key={index}
                component="button"
                onClick={() => handleFileClick(file)}
                sx={{ 
                  py: 0.5,
                  bgcolor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  '&:hover': { bgcolor: '#404040' },
                  '&:focus': { bgcolor: '#404040', outline: 'none' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>
                  {file.isDirectory ? (
                    <FolderIcon sx={{ color: '#ffd700', fontSize: 16 }} />
                  ) : (
                    <FileIcon sx={{ color: '#87ceeb', fontSize: 16 }} />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={file.name}
                  primaryTypographyProps={{ 
                    fontSize: '12px',
                    sx: { color: 'white' }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      
      {/* New File Dialog */}
      <Dialog 
        open={newFileDialogOpen} 
        onClose={handleDialogClose}
        PaperProps={{
          sx: {
            bgcolor: '#2d2d2d',
            color: 'white'
          }
        }}
      >
        <DialogTitle>Create New File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            fullWidth
            variant="outlined"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFile();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: '#555',
                },
                '&:hover fieldset': {
                  borderColor: '#777',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#ccc',
                '&.Mui-focused': {
                  color: '#1976d2',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} sx={{ color: '#ccc' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFile} 
            variant="contained"
            disabled={!newFileName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default FileExplorer;