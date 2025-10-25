import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function Editor({ value, onChange, language = 'javascript' }) {
  const [theme] = useState('vs-dark');

  // Map our language identifiers to Monaco Editor language identifiers
  const getMonacoLanguage = (lang) => {
    const languageMap = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'csharp',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'sql': 'sql',
      'php': 'php',
      'go': 'go',
      'rust': 'rust',
      'kotlin': 'kotlin',
      'swift': 'swift',
      'ruby': 'ruby',
      'perl': 'perl',
      'shell': 'shell',
      'powershell': 'powershell',
      'yaml': 'yaml',
      'markdown': 'markdown',
      'text': 'plaintext'
    };
    
    return languageMap[lang] || 'plaintext';
  };

  return (
    <MonacoEditor
      height="100%"
      language={getMonacoLanguage(language)}
      theme={theme}
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        parameterHints: { enabled: true },
        formatOnType: true,
        formatOnPaste: true,
      }}
    />
  );
}