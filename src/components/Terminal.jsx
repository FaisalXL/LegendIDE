import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';

const socket = io('http://localhost:3001');

const Terminal = forwardRef((props, ref) => {
  const terminalRef = useRef(null);
  const termRef = useRef(null);

  useImperativeHandle(ref, () => ({
    socket,
  }));

  useEffect(() => {
    const initTerminal = () => {
      const term = new XTerm({
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
        },
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorBlink: true,
      });
      termRef.current = term;

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (terminalRef.current) {
        term.open(terminalRef.current);
      }

      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch (e) {
            // ignore for now
          }
        }, 10);
      });

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      term.onData((data) => {
        socket.emit('terminal:write', data);
      });

      socket.on('terminal:data', (data) => {
        term.write(data);
      });

      return () => {
        if (terminalRef.current) {
          resizeObserver.unobserve(terminalRef.current);
        }
        term.dispose();
      };
    };

    const timeoutId = setTimeout(initTerminal, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div 
      ref={terminalRef} 
      style={{ 
        height: '100%', 
        width: '100%', 
        background: '#1e1e1e',
        padding: '8px'
      }} 
    />
  );
});

export default Terminal;