#!/usr/bin/env python3
"""
Claude Agent Service - A Python backend service that provides Claude Agent SDK integration
for complete project context and file operations.
"""

import os
import json
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
import anthropic

# Load environment variables from .env file
load_dotenv()

# For now, we'll create a simplified version that works with Python 3.9
# and can be upgraded to use the actual Claude Agent SDK when Python 3.10+ is available

app = FastAPI(title="Claude Agent Service", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Project configuration
PROJECT_ROOT = Path("/Users/faisal./Documents/trae_projects/Replitclone")
# Temporarily disable API key to test simulation mode
ANTHROPIC_API_KEY = None  # os.getenv("ANTHROPIC_API_KEY")

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    project_context: bool = True

class ChatResponse(BaseModel):
    response: str
    session_id: str
    project_files: Optional[List[str]] = None
    modified_files: Optional[List[str]] = None

class FileOperation(BaseModel):
    operation: str  # "create", "edit", "read", "delete"
    file_path: str
    content: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None

class ProjectAnalyzer:
    """Analyzes the project structure and provides context to Claude."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.ignore_patterns = {
            '.git', 'node_modules', '__pycache__', '.env', 
            'dist', 'build', '.next', '.vscode', '.idea',
            '*.log', '*.tmp', '*.cache'
        }
    
    def get_project_structure(self, max_depth: int = 3) -> Dict[str, Any]:
        """Get the project structure as a tree."""
        def build_tree(path: Path, current_depth: int = 0) -> Dict[str, Any]:
            if current_depth >= max_depth:
                return {"type": "directory", "truncated": True}
            
            if path.name.startswith('.') and path.name in self.ignore_patterns:
                return None
            
            if path.is_file():
                return {
                    "type": "file",
                    "size": path.stat().st_size,
                    "extension": path.suffix
                }
            elif path.is_dir():
                children = {}
                try:
                    for child in path.iterdir():
                        if not self._should_ignore(child):
                            child_tree = build_tree(child, current_depth + 1)
                            if child_tree:
                                children[child.name] = child_tree
                except PermissionError:
                    return {"type": "directory", "error": "Permission denied"}
                
                return {
                    "type": "directory",
                    "children": children
                }
            
            return None
        
        return build_tree(self.project_root)
    
    def _should_ignore(self, path: Path) -> bool:
        """Check if a path should be ignored."""
        name = path.name
        if name.startswith('.') and name != '.env.example':
            return True
        if name in self.ignore_patterns:
            return True
        if path.is_file() and any(name.endswith(pattern.replace('*', '')) 
                                 for pattern in self.ignore_patterns if '*' in pattern):
            return True
        return False
    
    def get_relevant_files(self, query: str, max_files: int = 10) -> List[Dict[str, Any]]:
        """Get files relevant to the query."""
        relevant_files = []
        
        # Simple relevance scoring based on file extensions and names
        query_lower = query.lower()
        
        for file_path in self._get_all_files():
            score = 0
            file_name = file_path.name.lower()
            file_ext = file_path.suffix.lower()
            
            # Score based on query keywords
            if any(keyword in file_name for keyword in query_lower.split()):
                score += 10
            
            # Score based on file type relevance
            if 'react' in query_lower or 'jsx' in query_lower:
                if file_ext in ['.jsx', '.js', '.tsx', '.ts']:
                    score += 5
            elif 'python' in query_lower or 'py' in query_lower:
                if file_ext == '.py':
                    score += 5
            elif 'style' in query_lower or 'css' in query_lower:
                if file_ext in ['.css', '.scss', '.sass']:
                    score += 5
            
            if score > 0:
                relevant_files.append({
                    "path": str(file_path.relative_to(self.project_root)),
                    "score": score,
                    "size": file_path.stat().st_size
                })
        
        # Sort by score and return top files
        relevant_files.sort(key=lambda x: x["score"], reverse=True)
        return relevant_files[:max_files]
    
    def _get_all_files(self) -> List[Path]:
        """Get all files in the project."""
        files = []
        
        def collect_files(path: Path):
            try:
                for item in path.iterdir():
                    if self._should_ignore(item):
                        continue
                    if item.is_file():
                        files.append(item)
                    elif item.is_dir():
                        collect_files(item)
            except PermissionError:
                pass
        
        collect_files(self.project_root)
        return files
    
    def read_file_content(self, file_path: str) -> str:
        """Read the content of a file."""
        full_path = self.project_root / file_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding or return binary indicator
            return f"[Binary file: {file_path}]"

class ClaudeAgentWrapper:
    """Wrapper for Claude Agent functionality."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.analyzer = ProjectAnalyzer(project_root)
        self.sessions = {}
        
        # Initialize Anthropic client
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None
    
    async def chat_with_context(self, message: str, session_id: str) -> Dict[str, Any]:
        """Chat with Claude using full project context."""
        
        # Get project structure and relevant files
        project_structure = self.analyzer.get_project_structure()
        relevant_files = self.analyzer.get_relevant_files(message)
        
        # Build context for Claude
        context_parts = [
            f"Project Root: {self.project_root}",
            f"Project Structure: {json.dumps(project_structure, indent=2)}",
            "\nRelevant Files:"
        ]
        
        # Add content of most relevant files
        for file_info in relevant_files[:5]:  # Limit to top 5 files
            try:
                content = self.analyzer.read_file_content(file_info["path"])
                if len(content) < 2000:  # Only include smaller files in context
                    context_parts.append(f"\n--- {file_info['path']} ---\n{content}")
                else:
                    context_parts.append(f"\n--- {file_info['path']} (truncated) ---\n{content[:1000]}...")
            except Exception as e:
                context_parts.append(f"\n--- {file_info['path']} (error reading: {e}) ---")
        
        full_context = "\n".join(context_parts)
        
        # Use actual Claude API if available, otherwise fall back to simulation
        if self.client:
            response = await self._call_claude_api(message, full_context)
        else:
            response = await self._simulate_claude_response(message, full_context)
        
        return {
            "response": response,
            "session_id": session_id,
            "project_files": [f["path"] for f in relevant_files],
            "context_used": True
        }
    
    async def _call_claude_api(self, message: str, context: str) -> str:
        """Call the actual Claude API with function calling capabilities."""
        try:
            # Prepare the system prompt with project context
            system_prompt = f"""You are an AI coding assistant with full access to the user's project. You have complete context about their codebase and can help with any coding task.

Project Context:
{context}

You can help with:
- Code analysis and understanding
- File creation and editing
- Debugging and troubleshooting
- Code refactoring and improvements
- Architecture and design decisions
- Documentation and explanations

When users ask you to create, edit, or delete files, use the provided tools to perform these operations. Always provide specific, actionable advice based on the actual project structure and code you can see."""

            # Define tools for file operations
            tools = [
                {
                    "name": "create_file",
                    "description": "Create a new file with the specified content",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "The path where the file should be created (relative to project root)"
                            },
                            "content": {
                                "type": "string",
                                "description": "The content to write to the file"
                            }
                        },
                        "required": ["file_path", "content"]
                    }
                },
                {
                    "name": "edit_file",
                    "description": "Edit an existing file with new content",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "The path of the file to edit (relative to project root)"
                            },
                            "content": {
                                "type": "string",
                                "description": "The new content for the file"
                            }
                        },
                        "required": ["file_path", "content"]
                    }
                },
                {
                    "name": "read_file",
                    "description": "Read the content of an existing file",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "The path of the file to read (relative to project root)"
                            }
                        },
                        "required": ["file_path"]
                    }
                },
                {
                    "name": "delete_file",
                    "description": "Delete an existing file from the project",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "The path of the file to delete (relative to project root)"
                            }
                        },
                        "required": ["file_path"]
                    }
                }
            ]

            # Make the API call with tools
            response = self.client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4000,
                temperature=0.1,
                system=system_prompt,
                tools=tools,
                messages=[
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            )
            
            # Handle tool calls if any
            if response.content and len(response.content) > 0:
                result_parts = []
                
                for content_block in response.content:
                    if content_block.type == "text":
                        result_parts.append(content_block.text)
                    elif content_block.type == "tool_use":
                        # Execute the tool call
                        tool_result = await self._execute_tool_call(content_block)
                        result_parts.append(tool_result)
                
                return "\n".join(result_parts)
            
            return "I apologize, but I didn't receive a proper response from the API."
            
        except Exception as e:
            logging.error(f"Error calling Claude API: {e}")
            return f"I apologize, but I encountered an error while processing your request: {str(e)}. Please try again."
    
    async def _execute_tool_call(self, tool_call) -> str:
        """Execute a tool call from Claude."""
        try:
            tool_name = tool_call.name
            tool_input = tool_call.input
            
            if tool_name == "create_file":
                file_path = tool_input.get("file_path")
                content = tool_input.get("content", "")
                
                # Create the file using the existing file operation logic
                full_path = self.project_root / file_path
                
                if full_path.exists():
                    return f"❌ File already exists: {file_path}"
                
                # Create parent directories if they don't exist
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return f"✅ File created successfully: {file_path}"
            
            elif tool_name == "edit_file":
                file_path = tool_input.get("file_path")
                content = tool_input.get("content", "")
                
                full_path = self.project_root / file_path
                
                if not full_path.exists():
                    return f"❌ File not found: {file_path}"
                
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return f"✅ File updated successfully: {file_path}"
            
            elif tool_name == "read_file":
                file_path = tool_input.get("file_path")
                
                full_path = self.project_root / file_path
                
                if not full_path.exists():
                    return f"❌ File not found: {file_path}"
                
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                return f"📄 Content of {file_path}:\n```\n{content}\n```"
            
            elif tool_name == "delete_file":
                file_path = tool_input.get("file_path")
                
                full_path = self.project_root / file_path
                
                if not full_path.exists():
                    return f"❌ File not found: {file_path}"
                
                if full_path.is_dir():
                    return f"❌ Cannot delete directory with delete_file: {file_path}. Use appropriate directory deletion method."
                
                # Delete the file
                full_path.unlink()
                
                return f"🗑️ File deleted successfully: {file_path}"
            
            else:
                return f"❌ Unknown tool: {tool_name}"
                
        except Exception as e:
            logging.error(f"Error executing tool call: {e}")
            return f"❌ Error executing {tool_call.name}: {str(e)}"
    
    async def _simulate_claude_response(self, message: str, context: str) -> str:
        """Simulate Claude response with actual file operations."""
        
        # Parse the message for file operations
        message_lower = message.lower()
        
        # Try to extract file operations from the message
        if "create" in message_lower and "file" in message_lower:
            # Look for file path and content in the message
            import re
            
            # Try to extract file path from common patterns
            file_patterns = [
                r'create\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+)?["\']?([^"\']+)["\']?',
                r'create\s+["\']?([^"\']+)["\']?',
                r'file\s+["\']?([^"\']+)["\']?'
            ]
            
            file_path = None
            for pattern in file_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    file_path = match.group(1).strip()
                    break
            
            if file_path:
                try:
                    # Create the file
                    full_path = self.project_root / file_path
                    
                    if full_path.exists():
                        return f"❌ File already exists: {file_path}"
                    
                    # Create parent directories if they don't exist
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Generate appropriate content based on file extension
                    content = self._generate_file_content(file_path)
                    
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    return f"✅ File created successfully: {file_path}\n\nContent:\n```\n{content}\n```"
                    
                except Exception as e:
                    return f"❌ Error creating file: {str(e)}"
            else:
                return """I can help you create a file! Please specify the file path more clearly. For example:
- "Create a file called test.js"
- "Create a new component MyComponent.jsx"
- "Create utils/helper.py"

What file would you like me to create?"""

        elif ("edit" in message_lower or "modify" in message_lower or "update" in message_lower) and "file" in message_lower:
            # Look for file path in the message
            import re
            
            file_patterns = [
                r'edit\s+(?:the\s+)?file\s+["\']?([^"\']+)["\']?',
                r'modify\s+["\']?([^"\']+)["\']?',
                r'update\s+["\']?([^"\']+)["\']?'
            ]
            
            file_path = None
            for pattern in file_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    file_path = match.group(1).strip()
                    break
            
            if file_path:
                try:
                    full_path = self.project_root / file_path
                    
                    if not full_path.exists():
                        return f"❌ File not found: {file_path}"
                    
                    # Read current content
                    with open(full_path, 'r', encoding='utf-8') as f:
                        current_content = f.read()
                    
                    return f"""📄 Current content of {file_path}:
```
{current_content}
```

I can see the file content. What specific changes would you like me to make? Please be specific about:
- What to add, remove, or modify
- Where in the file to make changes
- Any specific requirements

Note: In simulation mode, I can show you the current content but need more specific instructions to make changes."""
                    
                except Exception as e:
                    return f"❌ Error reading file: {str(e)}"
            else:
                return """I can help you edit files! Please specify which file you'd like to edit. For example:
- "Edit the file App.jsx"
- "Modify src/components/Header.jsx"
- "Update the package.json file"

Which file would you like to edit?"""

        elif "read" in message_lower and "file" in message_lower:
            # Look for file path in the message
            import re
            
            file_patterns = [
                r'read\s+(?:the\s+)?file\s+["\']?([^"\']+)["\']?',
                r'show\s+(?:me\s+)?(?:the\s+)?(?:content\s+of\s+)?["\']?([^"\']+)["\']?',
                r'view\s+["\']?([^"\']+)["\']?'
            ]
            
            file_path = None
            for pattern in file_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    file_path = match.group(1).strip()
                    break
            
            if file_path:
                try:
                    full_path = self.project_root / file_path
                    
                    if not full_path.exists():
                        return f"❌ File not found: {file_path}"
                    
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    return f"📄 Content of {file_path}:\n```\n{content}\n```"
                    
                except Exception as e:
                    return f"❌ Error reading file: {str(e)}"
            else:
                return """I can help you read files! Please specify which file you'd like to read. For example:
- "Read the file App.jsx"
- "Show me src/components/Header.jsx"
- "View the package.json file"

Which file would you like to read?"""

        else:
            return f"""I'm your AI coding assistant with full project context! I can see your project structure and understand your codebase.

I can help you with:
- **File Operations**: Create, edit, delete files with full project awareness
- **Code Analysis**: Understand relationships between files and components
- **Debugging**: Analyze errors with complete context
- **Refactoring**: Suggest improvements across multiple files
- **Documentation**: Generate docs based on actual code structure

Your project appears to be a React-based code editor (similar to Replit) with:
- Frontend: React with Vite
- Backend: Node.js with terminal integration
- AI Chat: Current Claude integration
- File Management: Complete file explorer

**Available Commands:**
- "Create a file called [filename]" - Creates a new file
- "Edit the file [filename]" - Shows file content for editing
- "Read the file [filename]" - Displays file content
- Ask me about your code structure, debugging, or improvements!

What would you like me to help you with?

Note: Running in simulation mode (Anthropic API key not configured). File operations are functional but responses are simplified."""

    def _generate_file_content(self, file_path: str) -> str:
        """Generate appropriate content based on file extension."""
        import os
        
        _, ext = os.path.splitext(file_path)
        filename = os.path.basename(file_path)
        
        if ext == '.js':
            return f"""// {filename}

console.log('Hello from {filename}');

export default function main() {{
    // Your code here
    return 'Hello World';
}}
"""
        elif ext == '.jsx':
            component_name = filename.replace('.jsx', '').replace('.js', '')
            component_name = ''.join(word.capitalize() for word in component_name.split('_'))
            
            return f"""import React from 'react';

const {component_name} = () => {{
    return (
        <div>
            <h1>{component_name} Component</h1>
            <p>This is a new React component.</p>
        </div>
    );
}};

export default {component_name};
"""
        elif ext == '.py':
            return f"""# {filename}

def main():
    \"\"\"Main function for {filename}\"\"\"
    print("Hello from {filename}")
    return True

if __name__ == "__main__":
    main()
"""
        elif ext == '.css':
            return f"""/* {filename} */

.container {{
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
}}

.title {{
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 16px;
}}
"""
        elif ext == '.md':
            return f"""# {filename.replace('.md', '').replace('_', ' ').title()}

This is a new markdown file.

## Getting Started

Add your content here.

## Features

- Feature 1
- Feature 2
- Feature 3
"""
        elif ext == '.json':
            return """{
    "name": "new-file",
    "version": "1.0.0",
    "description": "A new JSON file"
}
"""
        elif ext == '.html':
            return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{filename.replace('.html', '').replace('_', ' ').title()}</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a new HTML file.</p>
</body>
</html>
"""
        else:
            return f"""// {filename}
// This is a new file created by Claude Agent

// Add your content here
"""

# Initialize the project analyzer
project_analyzer = ProjectAnalyzer(PROJECT_ROOT)
claude_wrapper = ClaudeAgentWrapper(PROJECT_ROOT)

@app.post("/api/claude-agent/chat", response_model=ChatResponse)
async def chat_with_claude_agent(chat_request: ChatMessage):
    """Chat with Claude Agent using full project context."""
    try:
        session_id = chat_request.session_id or f"session_{asyncio.get_event_loop().time()}"
        
        result = await claude_wrapper.chat_with_context(
            chat_request.message, 
            session_id
        )
        
        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
            project_files=result.get("project_files"),
            modified_files=result.get("modified_files")
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.post("/api/claude-agent/file-operation")
async def perform_file_operation(operation: FileOperation):
    """Perform file operations through Claude Agent."""
    try:
        full_path = PROJECT_ROOT / operation.file_path
        
        if operation.operation == "read":
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            content = project_analyzer.read_file_content(operation.file_path)
            return {"content": content, "path": operation.file_path}
        
        elif operation.operation == "create":
            if full_path.exists():
                raise HTTPException(status_code=409, detail="File already exists")
            
            # Create parent directories if they don't exist
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(operation.content or "")
            
            return {"message": f"File created: {operation.file_path}"}
        
        elif operation.operation == "edit":
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(operation.content or "")
            
            return {"message": f"File updated: {operation.file_path}"}
        
        elif operation.operation == "delete":
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            full_path.unlink()
            return {"message": f"File deleted: {operation.file_path}"}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operation: {operation.operation}")
    
    except Exception as e:
        logger.error(f"File operation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File operation error: {str(e)}")

@app.get("/api/claude-agent/project-structure")
async def get_project_structure():
    """Get the project structure."""
    try:
        structure = project_analyzer.get_project_structure()
        return {"structure": structure, "root": str(PROJECT_ROOT)}
    except Exception as e:
        logger.error(f"Project structure error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Project structure error: {str(e)}")

@app.get("/api/claude-agent/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "project_root": str(PROJECT_ROOT),
        "anthropic_api_configured": bool(ANTHROPIC_API_KEY),
        "python_version": "3.9+ (Claude Agent SDK requires 3.10+)"
    }

if __name__ == "__main__":
    print("Starting Claude Agent Service...")
    print(f"Project Root: {PROJECT_ROOT}")
    print(f"Anthropic API Key: {'Configured' if ANTHROPIC_API_KEY else 'Not configured'}")
    
    uvicorn.run(
        "claude_agent_service:app",
        host="0.0.0.0",
        port=3002,
        reload=True,
        log_level="info"
    )