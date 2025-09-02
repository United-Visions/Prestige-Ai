import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Terminal as TerminalIcon, X, RefreshCw } from 'lucide-react';
import useAppStore from '@/stores/appStore';
import { ClaudeCodeService } from '@/services/claudeCodeService';

interface ClaudeCodeTerminalProps {
  onClose?: () => void;
}

export function ClaudeCodeTerminal({ onClose }: ClaudeCodeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const { currentApp, selectedModel } = useAppStore();

  // Debug: Log what model is selected when terminal initializes
  console.log('🖥️ Claude Code Terminal - Selected Model:', selectedModel);

  useEffect(() => {
    if (!terminalRef.current || isInitialized) return;

    // Ensure container has proper dimensions before initializing terminal
    const container = terminalRef.current;
    
    // Use requestAnimationFrame to ensure DOM is fully rendered
    const initializeTerminalDelayed = () => {
      requestAnimationFrame(() => {
        if (!container.offsetWidth || !container.offsetHeight) {
          console.log('🖥️ Container not ready, retrying...', {
            width: container.offsetWidth,
            height: container.offsetHeight,
            display: getComputedStyle(container).display,
            visibility: getComputedStyle(container).visibility
          });
          setTimeout(initializeTerminalDelayed, 50);
          return;
        }
        initializeTerminal();
      });
    };

    const initializeTerminal = () => {
      console.log('🖥️ Initializing terminal with container:', {
        width: container.offsetWidth,
        height: container.offsetHeight
      });

      // Initialize terminal
      const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
          background: '#1a1a1a',
          foreground: '#ffffff',
          cursor: '#ffffff',
          cursorAccent: '#ffffff',
          selectionBackground: '#44475a',
          black: '#000000',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#bd93f9',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
          brightBlack: '#44475a',
          brightRed: '#ff5555',
          brightGreen: '#50fa7b',
          brightYellow: '#f1fa8c',
          brightBlue: '#bd93f9',
          brightMagenta: '#ff79c6',
          brightCyan: '#8be9fd',
          brightWhite: '#ffffff'
        },
      allowTransparency: false,
      convertEol: true
    });

    // Add addons
    const fit = new FitAddon();
    fitAddon.current = fit;
    terminal.loadAddon(fit);
    terminal.loadAddon(new WebLinksAddon());

      // Open terminal in container
      terminal.open(container);
      
      // Safe fit with error handling
      try {
        fit.fit();
        console.log('🖥️ Initial fit successful:', terminal.cols, 'x', terminal.rows);
      } catch (error) {
        console.warn('🖥️ Initial fit failed:', error);
      }

      // Force refresh and ensure visibility with proper timing
      setTimeout(() => {
        if (!terminal || !container) return;
        
        // Ensure the container is visible and has dimensions
        console.log('🖥️ Pre-fit container dimensions:', {
          width: container.offsetWidth,
          height: container.offsetHeight,
          visible: container.offsetParent !== null
        });
        
        try {
          fit.fit();
          terminal.focus();
          
          // Test basic text rendering with better visibility
          terminal.clear();
          terminal.write('\x1b[1;32m'); // Set green color
          terminal.write('==========================================\r\n');
          terminal.write('    Claude Code Terminal\r\n');
          terminal.write('==========================================\r\n');
          terminal.write('\x1b[0m'); // Reset color
          terminal.write('\r\n');
          terminal.write('Welcome to Claude Code CLI interface!\r\n');
          terminal.write(`Selected Model: ${selectedModel.name} (${selectedModel.provider})\r\n`);
          if (currentApp) {
            terminal.write(`Current App: ${currentApp.name}\r\n`);
            terminal.write(`App Path: ${currentApp.path}\r\n`);
          } else {
            terminal.write('No app selected. Create or select an app first.\r\n');
          }
          terminal.write('\r\n');
          
          showPrompt();
          
          console.log('🖥️ Terminal initialized and focused, welcome message written');
          console.log('🖥️ Post-fit terminal size:', terminal.cols, 'x', terminal.rows);
        } catch (error) {
          console.error('🖥️ Terminal fit/focus error:', error);
        }
      }, 300);

      // Store terminal instance
      terminalInstance.current = terminal;

      // Initialize Claude Code service availability
      const claudeService = ClaudeCodeService.getInstance();
      claudeService.checkAvailability().then(isAvailable => {
        console.log('🔧 Claude Code Service Availability:', isAvailable);
        if (!isAvailable && terminal) {
          terminal.writeln('\x1b[1;31m⚠ Warning: Claude Code CLI availability check failed.\x1b[0m');
        }
      });

      // Define showPrompt function
      function showPrompt() {
        const appPrefix = currentApp ? `(${currentApp.name}) ` : '';
        const modelPrefix = selectedModel.name === 'claude-code' ? 'claude' : selectedModel.name;
        terminal.write(`\x1b[1;32m${appPrefix}${modelPrefix}>\x1b[0m `);
      }

      // Handle input
      let currentLine = '';
      terminal.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) { // Enter
        terminal.writeln('');
        if (currentLine.trim()) {
          executeCommand(currentLine.trim());
          setCommandHistory(prev => [...prev, currentLine.trim()]);
          setHistoryIndex(-1);
        }
        currentLine = '';
      } else if (domEvent.keyCode === 8) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (domEvent.keyCode === 38) { // Up arrow - command history
        if (commandHistory.length > 0) {
          const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          const historyCommand = commandHistory[newIndex];
          
          // Clear current line
          terminal.write('\r\x1b[K');
          showPrompt();
          terminal.write(historyCommand);
          currentLine = historyCommand;
        }
      } else if (domEvent.keyCode === 40) { // Down arrow
        if (historyIndex >= 0) {
          const newIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
          setHistoryIndex(newIndex);
          const historyCommand = commandHistory[newIndex];
          
          // Clear current line
          terminal.write('\r\x1b[K');
          showPrompt();
          terminal.write(historyCommand);
          currentLine = historyCommand;
        }
      } else if (printable) {
        currentLine += key;
        terminal.write(key);
      }
    });

      function executeCommand(command: string) {
      const [cmd, ...args] = command.split(' ');
      const argString = args.join(' ');

      switch (cmd.toLowerCase()) {
        case 'clear':
          terminal.clear();
          showPrompt();
          break;
        
        case 'help':
          terminal.writeln('\x1b[1;34mAvailable commands:\x1b[0m');
          terminal.writeln('  claude <message>     - Send message to Claude Code');
          terminal.writeln('  clear               - Clear terminal');
          terminal.writeln('  help                - Show this help');
          terminal.writeln('  exit                - Exit Claude Code mode');
          showPrompt();
          break;
        
        case 'exit':
          terminal.writeln('\x1b[1;33mExiting Claude Code mode...\x1b[0m');
          onClose?.();
          break;
        
        case 'claude':
          if (!argString.trim()) {
            terminal.writeln('\x1b[1;31mError: Please provide a message for Claude\x1b[0m');
            terminal.writeln('\x1b[1;33mUsage: claude <your message>\x1b[0m');
          } else {
            executeClaudeCommand(argString);
          }
          break;
        
        default:
          if (command.trim()) {
            // Default to Claude command if not recognized
            executeClaudeCommand(command);
          } else {
            showPrompt();
          }
          break;
      }
    }

    async function executeClaudeCommand(message: string) {
      terminal.writeln(`\x1b[1;36m→ Sending to Claude Code:\x1b[0m ${message}`);
      terminal.writeln('\x1b[1;33m⚡ Processing...\x1b[0m');
      
      try {
        const claudeService = ClaudeCodeService.getInstance();
        
        // Force check availability before executing
        const isAvailable = await claudeService.checkAvailability();
        if (!isAvailable) {
          terminal.writeln('\x1b[1;31m✗ Error: Claude Code CLI is not available. Please ensure it\'s installed and configured.\x1b[0m');
          terminal.writeln('');
          showPrompt();
          return;
        }
        
        // Check if we have a current conversation
        const { currentConversation } = useAppStore.getState();
        if (!currentConversation) {
          terminal.writeln('\x1b[1;31m✗ Error: No active conversation. Please create an app first.\x1b[0m');
          terminal.writeln('');
          showPrompt();
          return;
        }
        
        // Use the ClaudeCodeService to send the message
        const response = await claudeService.continueConversation(currentConversation.id, message);
        
        if (response) {
          terminal.writeln('');
          terminal.writeln('\x1b[1;32m✓ Claude Code Response:\x1b[0m');
          terminal.writeln('\x1b[2;37m' + '─'.repeat(60) + '\x1b[0m');
          
          // Format and display response
          const lines = response.split('\n');
          lines.forEach(line => {
            terminal.writeln(`\x1b[0m${line}`);
          });
          
          terminal.writeln('\x1b[2;37m' + '─'.repeat(60) + '\x1b[0m');
        } else {
          terminal.writeln('\x1b[1;31m✗ No response received from Claude Code\x1b[0m');
        }
      } catch (error) {
        terminal.writeln(`\x1b[1;31m✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
        
        if (error instanceof Error && error.message.includes('Usage limit')) {
          terminal.writeln('\x1b[1;33mℹ Claude Code CLI has reached its usage limit. Please try again later.\x1b[0m');
        }
      }
      
      terminal.writeln('');
      showPrompt();
      }
    };

    // Start the initialization process
    initializeTerminalDelayed();
    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('🖥️ Resize fit failed:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, [isInitialized, currentApp, commandHistory, historyIndex, onClose, selectedModel]);

  const handleClear = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      terminalInstance.current.write('\x1b[1;32mclaude>\x1b[0m ');
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full bg-[#1a1a1a] border-gray-700">
      <CardHeader className="flex-shrink-0 border-b border-gray-700 bg-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Claude Code Terminal</h3>
              <p className="text-sm text-gray-400">
                Interactive command-line interface for Claude Code
                {currentApp && ` • ${currentApp.name}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 px-3 text-gray-300 hover:text-white hover:bg-gray-700"
              title="Clear Terminal"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
              title="Exit Claude Code Mode"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 bg-[#1a1a1a] overflow-hidden">
        <div 
          ref={terminalRef} 
          className="flex-1 bg-[#1a1a1a] relative"
          style={{ 
            minHeight: '400px',
            minWidth: '600px',
            width: '100%',
            height: '100%',
            padding: '16px',
            display: 'block',
            visibility: 'visible',
            opacity: 1
          }}
        />
      </CardContent>
    </Card>
  );
}