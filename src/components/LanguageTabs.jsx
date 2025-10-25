import { Box, Tabs, Tab, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

export default function LanguageTabs({ tabs, activeTab, onChange, onCloseTab }) {
  const handleCloseTab = (event, tabIndex) => {
    event.stopPropagation();
    if (onCloseTab) {
      onCloseTab(tabIndex);
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#2d2d2d' }}>
      <Tabs 
        value={activeTab} 
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            color: '#ccc',
            fontSize: '12px',
            minHeight: '36px',
            textTransform: 'none'
          },
          '& .Mui-selected': {
            color: 'white'
          }
        }}
      >
        {tabs.map((tab, index) => (
          <Tab 
            key={index}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{tab.name}</span>
                <IconButton
                  size="small"
                  onClick={(e) => handleCloseTab(e, index)}
                  sx={{ 
                    p: 0.25, 
                    color: '#ccc',
                    '&:hover': { color: 'white', bgcolor: '#555' }
                  }}
                >
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}