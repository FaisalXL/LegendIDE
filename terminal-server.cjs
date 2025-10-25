require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

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

// New folder creation endpoint
app.post('/api/create-folder', (req, res) => {
  const { folderPath } = req.body;
  
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }
  
  try {
    // Check if folder already exists
    if (fs.existsSync(folderPath)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }
    
    // Create the folder
    fs.mkdirSync(folderPath, { recursive: true });
    res.json({ success: true, path: folderPath });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create folder' });
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

// Claude API configuration
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude chat endpoint
app.post('/api/claude-chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    console.log('💬 Claude API request:', { message: message.substring(0, 100) + '...', historyLength: conversationHistory.length });

    // Build messages array for Claude API
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: messages,
      system: `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest. You can help with coding, writing, analysis, math, and many other tasks.

When users ask you to create, modify, or work with files, you should provide clear instructions on how to do so manually, along with the complete code they need. You cannot directly create or modify files yourself, but you can guide users through the process step by step.

For example, if asked to create a file, you should:
1. Tell them the filename and location
2. Provide the complete code content
3. Give clear instructions on how to create the file manually

Always be helpful and provide working, complete code examples.`
    });

    const assistantMessage = response.content[0].text;

    res.json({ 
      response: assistantMessage,
      conversationHistory: [
        ...conversationHistory, 
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage }
      ]
    });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Interactive Claude CLI sessions storage
const activeSessions = new Map();

// Interactive Claude CLI endpoint
app.post('/api/claude-cli-interactive', async (req, res) => {
  const { message, sessionId, response } = req.body;
  
  console.log('🔄 Interactive Claude CLI request:', { 
    message: message?.substring(0, 100) + '...', 
    sessionId, 
    hasResponse: !!response 
  });

  try {
    // If this is a response to a permission question
    if (sessionId && response !== undefined) {
      const session = activeSessions.get(sessionId);
      if (session && session.process && !session.process.killed) {
        // Send the user's response to Claude CLI
        session.process.stdin.write(response + '\n');
        return res.json({ status: 'response_sent' });
      } else {
        return res.status(404).json({ error: 'Session not found or expired' });
      }
    }

    // Start a new Claude CLI session
    if (!message) {
      return res.status(400).json({ error: 'Message is required for new sessions' });
    }

    const newSessionId = Date.now().toString();
    
    // Start Claude CLI process interactively
    const claudeProcess = spawn('claude', [message], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
      }
    });

    let output = '';
    let isWaitingForInput = false;
    let responseTimeout;

    const session = {
      process: claudeProcess,
      sessionId: newSessionId,
      startTime: Date.now()
    };

    activeSessions.set(newSessionId, session);

    // Handle stdout (normal output and questions)
    claudeProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      console.log('Claude CLI Output:', text);
      
      // Check if Claude is asking for permission (common patterns)
      if (text.includes('(y/n)') || 
          text.includes('(Y/n)') || 
          text.includes('(yes/no)') ||
          text.includes('Continue?') ||
          text.includes('Proceed?') ||
          text.includes('Allow?')) {
        
        isWaitingForInput = true;
        
        // Clear any existing timeout
        if (responseTimeout) {
          clearTimeout(responseTimeout);
        }
        
        // Send the question to the frontend
        res.json({
          type: 'permission_request',
          question: text.trim(),
          sessionId: newSessionId,
          output: output
        });
        
        // Set a timeout for user response (30 seconds)
        responseTimeout = setTimeout(() => {
          if (session.process && !session.process.killed) {
            console.log('Session timeout, sending default "no" response');
            session.process.stdin.write('n\n');
          }
        }, 30000);
        
        return;
      }
    });

    // Handle stderr (errors)
    claudeProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      console.error('Claude CLI Error:', errorText);
      output += errorText;
    });

    // Handle process completion
    claudeProcess.on('close', (code) => {
      console.log('Claude CLI process closed with code:', code);
      
      // Store final output in session before cleanup
      if (session) {
        session.finalOutput = output.trim();
        session.exitCode = code;
        session.completed = true;
      }
      
      if (responseTimeout) {
        clearTimeout(responseTimeout);
      }
      
      // If we haven't sent a response yet (no permission questions)
      if (!isWaitingForInput) {
        activeSessions.delete(newSessionId);
        res.json({
          type: 'completed',
          output: output.trim(),
          exitCode: code,
          sessionId: newSessionId
        });
      }
      // If we're waiting for input, the session will be cleaned up by polling
    });

    // Handle process errors
    claudeProcess.on('error', (error) => {
      console.error('Claude CLI Process Error:', error);
      activeSessions.delete(newSessionId);
      
      if (!isWaitingForInput) {
        res.status(500).json({ 
          error: 'Failed to start Claude CLI process',
          details: error.message 
        });
      }
    });

    // Set a timeout for the initial response (10 seconds)
    setTimeout(() => {
      if (!isWaitingForInput && !res.headersSent) {
        // If no permission question was asked, send the output
        claudeProcess.kill();
        activeSessions.delete(newSessionId);
        
        res.json({
          type: 'completed',
          output: output.trim() || 'No output received',
          sessionId: newSessionId
        });
      }
    }, 10000);

  } catch (error) {
    console.error('Interactive Claude CLI Error:', error);
    res.status(500).json({ error: 'Failed to process interactive Claude CLI request' });
  }
});

// Session status endpoint for polling
app.get('/api/claude-cli-session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.process && !session.process.killed) {
    // Session is still active
    res.json({ 
      status: 'active',
      type: 'running',
      sessionId: sessionId 
    });
  } else {
    // Session has completed
    activeSessions.delete(sessionId);
    res.json({ 
      status: 'completed',
      type: 'completed',
      output: session.finalOutput || 'Task completed.',
      sessionId: sessionId 
    });
  }
});

// Cleanup endpoint for abandoned sessions
app.delete('/api/claude-cli-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (session && session.process && !session.process.killed) {
    session.process.kill();
    activeSessions.delete(sessionId);
    res.json({ status: 'session_terminated' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// File operations are now handled directly by Claude CLI
// No separate endpoint needed since Claude CLI has native file system access

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