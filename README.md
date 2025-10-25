# LegendIDE

A Replit-like code editor built with React and Vite. Features a multi-language code editor with syntax highlighting, integrated terminal, file explorer, and code execution capabilities.

## Features

- 🎨 **Multi-language Code Editor** with syntax highlighting
- 📁 **File Explorer** with directory navigation
- 💻 **Integrated Terminal** with command execution
- ▶️ **Run Button** for executing code in multiple languages (Python, C++, JavaScript, Go, Ruby)
- 🗂️ **Language Tabs** for different file types
- 🎯 **Default Workspace** set to `dev/codeforces` for competitive programming

## How to Run

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/FaisalXL/LegendIDE.git
   cd LegendIDE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the terminal server (Required for terminal functionality):**
   ```bash
   node terminal-server.cjs
   ```
   This will start the backend server on port 3001 for terminal and file operations.

4. **Start the development server (In a new terminal):**
   ```bash
   npm run dev
   ```
   This will start the React app on http://localhost:5173

5. **Open your browser:**
   Navigate to http://localhost:5173 to use the IDE.

### Important Notes

- **Both servers must be running**: The terminal server (port 3001) and the React dev server (port 5173)
- The file explorer and terminal default to the `dev/codeforces` directory
- Sample files are included in `dev/codeforces/` for testing

### Usage

1. Use the file explorer on the left to navigate and open files
2. Edit code in the main editor area
3. Use the integrated terminal at the bottom for command-line operations
4. Click the "Run" button to execute your code
5. Switch between different file types using the language tabs

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js with Express
- **Terminal**: node-pty for terminal emulation
- **Editor**: Monaco Editor (VS Code editor)
- **Styling**: CSS with modern design

## Development

For development, you can modify the components in the `src/components/` directory:
- `Editor.jsx` - Main code editor
- `FileExplorer.jsx` - File navigation
- `Terminal.jsx` - Terminal interface
- `LanguageTabs.jsx` - Language switching tabs
