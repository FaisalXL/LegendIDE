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

  socket.on('execute:code', ({ code, language }) => {
    const tempDir = os.tmpdir();
    let filePath;
    let commands = [];
    let fileExtension;

    // Language execution mapping
    const languageConfig = {
      // Interpreted Languages
      'python': {
        extension: 'py',
        commands: [`python3 {{file}}`],
        fallbackCommands: [`python {{file}}`]
      },
      'javascript': {
        extension: 'js',
        commands: [`node {{file}}`]
      },
      'ruby': {
        extension: 'rb',
        commands: [`ruby {{file}}`]
      },
      'php': {
        extension: 'php',
        commands: [`php {{file}}`]
      },
      'perl': {
        extension: 'pl',
        commands: [`perl {{file}}`]
      },
      'lua': {
        extension: 'lua',
        commands: [`lua {{file}}`]
      },
      'r': {
        extension: 'r',
        commands: [`Rscript {{file}}`]
      },
      'shell': {
        extension: 'sh',
        commands: [`chmod +x {{file}} && {{file}}`]
      },
      'bash': {
        extension: 'sh',
        commands: [`chmod +x {{file}} && bash {{file}}`]
      },
      'powershell': {
        extension: 'ps1',
        commands: [`powershell -ExecutionPolicy Bypass -File {{file}}`]
      },
      
      // Compiled Languages
      'c': {
        extension: 'c',
        commands: [
          `gcc {{file}} -o {{output}} && {{output}}`,
          `clang {{file}} -o {{output}} && {{output}}`
        ]
      },
      'cpp': {
        extension: 'cpp',
        commands: [
          `g++ {{file}} -o {{output}} && {{output}}`,
          `clang++ {{file}} -o {{output}} && {{output}}`
        ]
      },
      'java': {
        extension: 'java',
        commands: [`javac {{file}} && java {{classname}}`]
      },
      'go': {
        extension: 'go',
        commands: [`go run {{file}}`]
      },
      'rust': {
        extension: 'rs',
        commands: [`rustc {{file}} -o {{output}} && {{output}}`]
      },
      'kotlin': {
        extension: 'kt',
        commands: [`kotlinc {{file}} -include-runtime -d {{jar}} && java -jar {{jar}}`]
      },
      'swift': {
        extension: 'swift',
        commands: [`swift {{file}}`]
      },
      'dart': {
        extension: 'dart',
        commands: [`dart {{file}}`]
      },
      
      // Other Languages
      'typescript': {
        extension: 'ts',
        commands: [
          `npx ts-node {{file}}`,
          `tsc {{file}} && node {{jsfile}}`
        ]
      },
      'coffeescript': {
        extension: 'coffee',
        commands: [`coffee {{file}}`]
      },
      'scala': {
        extension: 'scala',
        commands: [`scala {{file}}`]
      },
      'haskell': {
        extension: 'hs',
        commands: [
          `runhaskell {{file}}`,
          `ghc {{file}} -o {{output}} && {{output}}`
        ]
      },
      'elixir': {
        extension: 'ex',
        commands: [`elixir {{file}}`]
      },
      'erlang': {
        extension: 'erl',
        commands: [`escript {{file}}`]
      },
      'clojure': {
        extension: 'clj',
        commands: [`clojure {{file}}`]
      }
    };

    const config = languageConfig[language.toLowerCase()];
    
    if (!config) {
      ptyProcess.write(`Error: Language '${language}' is not supported for execution.\n`);
      ptyProcess.write(`Supported languages: ${Object.keys(languageConfig).join(', ')}\n`);
      return;
    }

    fileExtension = config.extension;
    filePath = path.join(tempDir, `temp_script.${fileExtension}`);
    
    // Generate output file path for compiled languages
    const outputPath = path.join(tempDir, 'temp_executable');
    const jarPath = path.join(tempDir, 'temp_script.jar');
    const jsPath = path.join(tempDir, 'temp_script.js');
    
    // Extract class name for Java
    const className = language === 'java' ? 
      (code.match(/public\s+class\s+(\w+)/) || ['', 'TempScript'])[1] : 
      'TempScript';

    // Prepare commands with placeholders replaced
    commands = config.commands.map(cmd => 
      cmd.replace(/\{\{file\}\}/g, filePath)
         .replace(/\{\{output\}\}/g, outputPath)
         .replace(/\{\{jar\}\}/g, jarPath)
         .replace(/\{\{jsfile\}\}/g, jsPath)
         .replace(/\{\{classname\}\}/g, className)
    );

    // Add fallback commands if available
    if (config.fallbackCommands) {
      commands = commands.concat(config.fallbackCommands.map(cmd => 
        cmd.replace(/\{\{file\}\}/g, filePath)
           .replace(/\{\{output\}\}/g, outputPath)
           .replace(/\{\{jar\}\}/g, jarPath)
           .replace(/\{\{jsfile\}\}/g, jsPath)
           .replace(/\{\{classname\}\}/g, className)
      ));
    }

    // Write the code to temporary file
    fs.writeFile(filePath, code, (err) => {
      if (err) {
        console.error('Error writing temp file:', err);
        ptyProcess.write('Error creating temporary file for execution.\n');
        return;
      }

      // Try executing with the first command, fallback to others if needed
      const executeCommand = (commandIndex = 0) => {
        if (commandIndex >= commands.length) {
          ptyProcess.write(`Error: Unable to execute ${language} code. Please ensure the required compiler/interpreter is installed.\n`);
          return;
        }

        const command = commands[commandIndex];
        // Clear the terminal and show a clean execution message
        ptyProcess.write(`\n# Running ${language} code...\n`);
        ptyProcess.write(`${command}\n`);
      };

      executeCommand();
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3001, () => {
  console.log('Terminal server is running on port 3001');
});