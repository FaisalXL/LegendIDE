const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';
// Set default working directory to dev/codeforces within the project
const projectRoot = process.cwd();
const defaultWorkingDir = path.join(projectRoot, 'dev', 'codeforces');
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: defaultWorkingDir,
  env: process.env
});

const app = express();
const server = http.createServer(app);

// Add CORS middleware for Express routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add middleware for JSON parsing
app.use(express.json());

// File system endpoints
app.get('/api/files', (req, res) => {
  const dirPath = req.query.path || defaultWorkingDir;
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const fileList = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dirPath, item.name)
    }));
    
    res.json({ files: fileList, currentPath: dirPath });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read directory' });
  }
});

app.get('/api/file-content', (req, res) => {
  const filePath = req.query.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read file' });
  }
});

// New file creation endpoint
app.post('/api/create-file', (req, res) => {
  const { filePath, content = '' } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'File already exists' });
    }
    
    // Create the file
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create file' });
  }
});

// File save endpoint
app.post('/api/save-file', (req, res) => {
  const { filePath, content } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save the file
    fs.writeFileSync(filePath, content, 'utf8');
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Unable to save file' });
  }
});

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');

  ptyProcess.on('data', function (data) {
    socket.emit('terminal:data', data);
  });

  socket.on('terminal:write', (data) => {
    ptyProcess.write(data);
  });

  socket.on('execute:code', ({ filePath }) => {
    if (!filePath) {
      ptyProcess.write('echo "Error: No file selected to run"\r');
      return;
    }

    // Get file extension to determine language
    const ext = path.extname(filePath).toLowerCase();
    
    // Simple language-to-command mapping
    const runCommands = {
      '.py': 'python3',
      '.js': 'node', 
      '.cpp': 'g++ -o a.out && ./a.out',
      '.c': 'gcc -o a.out && ./a.out',
      '.java': 'javac && java',
      '.go': 'go run',
      '.rb': 'ruby',
      '.php': 'php',
      '.sh': 'bash',
      '.pl': 'perl',
      '.rs': 'rustc -o a.out && ./a.out'
    };

    const command = runCommands[ext];
    
    if (!command) {
      ptyProcess.write(`echo "Error: File type '${ext}' is not supported for execution"\r`);
      return;
    }

    // For compiled languages, handle compilation + execution
    if (ext === '.cpp' || ext === '.c') {
      const fileName = path.basename(filePath);
      ptyProcess.write(`echo "Compiling and running ${fileName}..." && ${command.replace('a.out', fileName.replace(ext, ''))} "${filePath}"\r`);
    } else if (ext === '.java') {
      const className = path.basename(filePath, '.java');
      ptyProcess.write(`echo "Compiling and running ${className}.java..." && javac "${filePath}" && java -cp "${path.dirname(filePath)}" ${className}\r`);
    } else if (ext === '.rs') {
      const fileName = path.basename(filePath);
      ptyProcess.write(`echo "Compiling and running ${fileName}..." && ${command.replace('a.out', fileName.replace(ext, ''))} "${filePath}"\r`);
    } else {
      // For interpreted languages, just run directly
      const fileName = path.basename(filePath);
      ptyProcess.write(`echo "Running ${fileName}..." && ${command} "${filePath}"\r`);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3001, () => {
  console.log('Terminal server is running on port 3001');
});