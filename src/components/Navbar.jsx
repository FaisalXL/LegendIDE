import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Menu, 
  MenuItem, 
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  FiFile, 
  FiFolder, 
  FiFolderPlus, 
  FiEdit, 
  FiSearch, 
  FiSettings,
  FiHelpCircle
} from 'react-icons/fi';

const Navbar = ({ onNewFile, onNewFolder, onOpenFile }) => {
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [editMenuAnchor, setEditMenuAnchor] = useState(null);
  const [viewMenuAnchor, setViewMenuAnchor] = useState(null);
  const [helpMenuAnchor, setHelpMenuAnchor] = useState(null);
  
  // Dialog states
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [fileName, setFileName] = useState('');
  const [folderName, setFolderName] = useState('');

  const handleFileMenuClick = (event) => {
    setFileMenuAnchor(event.currentTarget);
  };

  const handleEditMenuClick = (event) => {
    setEditMenuAnchor(event.currentTarget);
  };

  const handleViewMenuClick = (event) => {
    setViewMenuAnchor(event.currentTarget);
  };

  const handleHelpMenuClick = (event) => {
    setHelpMenuAnchor(event.currentTarget);
  };

  const handleCloseMenus = () => {
    setFileMenuAnchor(null);
    setEditMenuAnchor(null);
    setViewMenuAnchor(null);
    setHelpMenuAnchor(null);
  };

  const handleNewFile = () => {
    setNewFileDialog(true);
    handleCloseMenus();
  };

  const handleNewFolder = () => {
    setNewFolderDialog(true);
    handleCloseMenus();
  };

  const handleCreateFile = () => {
    if (fileName.trim()) {
      onNewFile(fileName.trim());
      setFileName('');
      setNewFileDialog(false);
    }
  };

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      onNewFolder(folderName.trim());
      setFolderName('');
      setNewFolderDialog(false);
    }
  };

  const menuButtonStyle = {
    color: '#cccccc',
    textTransform: 'none',
    fontSize: '13px',
    fontWeight: 400,
    padding: '4px 12px',
    minWidth: 'auto',
    '&:hover': {
      backgroundColor: '#2a2d2e',
    }
  };

  return (
    <>
      <Box sx={{
        height: '30px',
        backgroundColor: '#323233',
        borderBottom: '1px solid #2d2d30',
        display: 'flex',
        alignItems: 'center',
        px: 1,
        gap: 0.5
      }}>
        {/* App Title */}
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#cccccc', 
            fontSize: '13px',
            fontWeight: 500,
            mr: 2,
            ml: 1
          }}
        >
          LegendIDE
        </Typography>

        {/* Menu Items */}
        <Button
          sx={menuButtonStyle}
          onClick={handleFileMenuClick}
        >
          File
        </Button>

        <Button
          sx={menuButtonStyle}
          onClick={handleEditMenuClick}
        >
          Edit
        </Button>

        <Button
          sx={menuButtonStyle}
          onClick={handleViewMenuClick}
        >
          View
        </Button>

        <Button
          sx={menuButtonStyle}
          onClick={handleHelpMenuClick}
        >
          Help
        </Button>
      </Box>

      {/* File Menu */}
      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={handleCloseMenus}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
            '& .MuiMenuItem-root': {
              color: '#cccccc',
              fontSize: '13px',
              padding: '6px 12px',
              '&:hover': {
                backgroundColor: '#2a2d2e',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleNewFile}>
          <FiFile style={{ marginRight: '8px', fontSize: '14px' }} />
          New File
        </MenuItem>
        <MenuItem onClick={handleNewFolder}>
          <FiFolderPlus style={{ marginRight: '8px', fontSize: '14px' }} />
          New Folder
        </MenuItem>
        <Divider sx={{ backgroundColor: '#454545' }} />
        <MenuItem onClick={() => { onOpenFile(); handleCloseMenus(); }}>
          <FiFolder style={{ marginRight: '8px', fontSize: '14px' }} />
          Open File
        </MenuItem>
        <Divider sx={{ backgroundColor: '#454545' }} />
        <MenuItem onClick={handleCloseMenus}>
          Save
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Save As...
        </MenuItem>
      </Menu>

      {/* Edit Menu */}
      <Menu
        anchorEl={editMenuAnchor}
        open={Boolean(editMenuAnchor)}
        onClose={handleCloseMenus}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
            '& .MuiMenuItem-root': {
              color: '#cccccc',
              fontSize: '13px',
              padding: '6px 12px',
              '&:hover': {
                backgroundColor: '#2a2d2e',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleCloseMenus}>
          Undo
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Redo
        </MenuItem>
        <Divider sx={{ backgroundColor: '#454545' }} />
        <MenuItem onClick={handleCloseMenus}>
          Cut
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Copy
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Paste
        </MenuItem>
        <Divider sx={{ backgroundColor: '#454545' }} />
        <MenuItem onClick={handleCloseMenus}>
          <FiSearch style={{ marginRight: '8px', fontSize: '14px' }} />
          Find
        </MenuItem>
      </Menu>

      {/* View Menu */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={handleCloseMenus}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
            '& .MuiMenuItem-root': {
              color: '#cccccc',
              fontSize: '13px',
              padding: '6px 12px',
              '&:hover': {
                backgroundColor: '#2a2d2e',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleCloseMenus}>
          Explorer
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Terminal
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          AI Chat
        </MenuItem>
        <Divider sx={{ backgroundColor: '#454545' }} />
        <MenuItem onClick={handleCloseMenus}>
          Zoom In
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Zoom Out
        </MenuItem>
      </Menu>

      {/* Help Menu */}
      <Menu
        anchorEl={helpMenuAnchor}
        open={Boolean(helpMenuAnchor)}
        onClose={handleCloseMenus}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
            '& .MuiMenuItem-root': {
              color: '#cccccc',
              fontSize: '13px',
              padding: '6px 12px',
              '&:hover': {
                backgroundColor: '#2a2d2e',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleCloseMenus}>
          <FiHelpCircle style={{ marginRight: '8px', fontSize: '14px' }} />
          Documentation
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          Keyboard Shortcuts
        </MenuItem>
        <MenuItem onClick={handleCloseMenus}>
          About
        </MenuItem>
      </Menu>

      {/* New File Dialog */}
      <Dialog 
        open={newFileDialog} 
        onClose={() => setNewFileDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
          }
        }}
      >
        <DialogTitle sx={{ color: '#cccccc', fontSize: '16px' }}>
          Create New File
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            fullWidth
            variant="outlined"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="example.js"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#cccccc',
                '& fieldset': {
                  borderColor: '#454545',
                },
                '&:hover fieldset': {
                  borderColor: '#007acc',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#007acc',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#cccccc',
              },
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFile();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNewFileDialog(false)}
            sx={{ color: '#cccccc' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFile}
            sx={{ color: '#007acc' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog 
        open={newFolderDialog} 
        onClose={() => setNewFolderDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
          }
        }}
      >
        <DialogTitle sx={{ color: '#cccccc', fontSize: '16px' }}>
          Create New Folder
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            variant="outlined"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="my-folder"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#cccccc',
                '& fieldset': {
                  borderColor: '#454545',
                },
                '&:hover fieldset': {
                  borderColor: '#007acc',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#007acc',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#cccccc',
              },
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNewFolderDialog(false)}
            sx={{ color: '#cccccc' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder}
            sx={{ color: '#007acc' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;