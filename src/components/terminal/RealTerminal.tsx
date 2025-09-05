import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Terminal as TerminalIcon, X, RefreshCw, Copy, AlertTriangle } from 'lucide-react';
import useAppStore from '@/stores/appStore';
import { resolveAppPaths } from '@/utils/appPathResolver';
import { ErrorDetectionService, type ErrorReport } from '@/services/errorDetectionService';
import { showToast } from '@/utils/toast';

// Extend Window interface to include Prestige-specific properties
declare global {
  interface Window {
    prestigeErrorPrompt?: string;
  }
}

interface RealTerminalProps {
  onClose?: () => void;
}

export function RealTerminal({ onClose }: RealTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const sessionId = useRef<string | null>(null);
  const claudeAvailableRef = useRef<boolean>(false);
  const aiderAvailableRef = useRef<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  
  const { currentApp } = useAppStore();
  const errorService = ErrorDetectionService.getInstance();

  useEffect(() => {
    if (!terminalRef.current || isInitialized) return;

    const initializeTerminal = () => {
      const container = terminalRef.current;
      if (!container) return;

      requestAnimationFrame(() => {
        if (!container.offsetWidth || !container.offsetHeight) {
          setTimeout(initializeTerminal, 50);
          return;
        }

        console.log('🖥️ Initializing real terminal with dimensions:', {
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
        
        try {
          fit.fit();
          console.log('🖥️ Initial fit successful:', terminal.cols, 'x', terminal.rows);
        } catch (error) {
          console.warn('🖥️ Initial fit failed:', error);
        }

        // Store terminal instance
        terminalInstance.current = terminal;

        // Start the shell process
        setTimeout(() => startShellProcess(terminal), 100);

        // Handle resize
        const handleResize = () => {
          if (fitAddon.current && terminalInstance.current && sessionId.current) {
            try {
              fitAddon.current.fit();
              // Notify the shell process of the resize
              const cols = terminalInstance.current.cols;
              const rows = terminalInstance.current.rows;
              window.electronAPI?.terminal.resize(sessionId.current, cols, rows);
            } catch (error) {
              console.warn('🖥️ Resize fit failed:', error);
            }
          }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        const cleanup = () => {
          window.removeEventListener('resize', handleResize);
          if (sessionId.current) {
            window.electronAPI?.terminal.removeListeners(sessionId.current);
            window.electronAPI?.terminal.kill(sessionId.current);
          }
          if (terminalInstance.current) {
            terminalInstance.current.dispose();
          }
        };

        // Store cleanup function for later use
        (terminal as any)._cleanup = cleanup;
      });
    };

    initializeTerminal();
    setIsInitialized(true);

    return () => {
      if (terminalInstance.current && (terminalInstance.current as any)._cleanup) {
        (terminalInstance.current as any)._cleanup();
      }
    };
  }, [isInitialized, currentApp]);

  const startShellProcess = async (terminal: Terminal) => {
    if (!currentApp) {
      terminal.write('\x1b[1;33mNo app selected. Please select an app to continue.\x1b[0m\r\n');
      return;
    }

    try {
      console.log('🚀 Starting shell process for app:', currentApp.name);

      // Resolve absolute path to app root (not the files subfolder) inside prestige-ai directory
      const { appRoot: absoluteAppPath } = await resolveAppPaths(currentApp);

      // Create terminal session using Electron API
      const sessionResult = await window.electronAPI?.terminal.createSession({
        cwd: absoluteAppPath,
        cols: terminal.cols,
        rows: terminal.rows,
        appId: currentApp.id,
        appName: currentApp.name,
        env: {
          PRESTIGE_APP_ID: currentApp.id.toString(),
          PRESTIGE_APP_NAME: currentApp.name,
          PRESTIGE_APP_PATH: absoluteAppPath,
          CLAUDE_CODE_WORKING_DIR: absoluteAppPath,
          PWD: absoluteAppPath
        }
      });

      if (!sessionResult) {
        terminal.write('\x1b[1;31m✗ Failed to create terminal session\x1b[0m\r\n');
        return;
      }

      sessionId.current = sessionResult.sessionId;

      // Track current command for special handling
      let currentCommand = '';
      
      // Handle terminal input
      terminal.onData((data) => {
        if (!sessionId.current) return;

        // Track command being typed
        if (data === '\r') {
          // Enter pressed - check for special commands
          const cmd = currentCommand.trim();
          
          terminal.write('\r\n'); // Move to new line
          
          if (handleSpecialCommand(cmd, terminal)) {
            // Special command handled, show prompt again
            currentCommand = '';
            terminal.write('\x1b[1;32mprestige>\x1b[0m ');
            return;
          }
          
          if (cmd) {
            // Regular command - execute it via electron
            executeCommand(cmd, terminal);
          } else {
            // Empty command, just show prompt
            terminal.write('\x1b[1;32mprestige>\x1b[0m ');
          }
          
          currentCommand = '';
        } else if (data === '\x7f' || data === '\b') {
          // Backspace
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.slice(0, -1);
            terminal.write('\b \b'); // Move back, write space, move back again
          }
        } else if (data >= ' ' && data <= '~') {
          // Printable character
          currentCommand += data;
          terminal.write(data); // Echo the character
        }
        // Ignore other control characters for simplicity
      });

      // Handle terminal output
      window.electronAPI?.terminal.onData(sessionResult.sessionId, (data: string) => {
        terminal.write(data);
        // Monitor for errors in real-time
        monitorForErrors(data);
      });

      // Handle terminal exit
      window.electronAPI?.terminal.onExit(sessionResult.sessionId, (exitCode: number) => {
        terminal.write(`\r\n\x1b[1;36m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
        sessionId.current = null;
      });

      // The electron backend will send its own welcome message
      // We'll receive it through the terminal data handler
      
      // Show our UI welcome message first
      terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
      terminal.write('\x1b[1;32m    Claude Code Direct Terminal\x1b[0m\r\n');
      terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
  terminal.write('\x1b[1;33mSpecial Commands:\x1b[0m\r\n');
  terminal.write('  \x1b[1;36mfix\x1b[0m               - Auto-fix detected errors (Claude/Aider)\r\n');
  terminal.write('  \x1b[1;36mprestige-help\x1b[0m     - Show all available commands\r\n');
  terminal.write('  \x1b[1;36mclaude --help\x1b[0m     - Claude Code CLI help\r\n');
  terminal.write('  \x1b[1;36maider --help\x1b[0m      - Aider CLI help\r\n');
      terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
      terminal.write('\x1b[1;33mNote: This is a simplified terminal. For full shell features, use your system terminal.\x1b[0m\r\n');
      terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n\r\n');

      // Check Claude Code availability
  const isClaudeAvailable = await window.electronAPI?.terminal.checkClaudeAvailability();
  claudeAvailableRef.current = !!isClaudeAvailable;
  let aiderAvailable = false;
  try {
        if ((window as any).electronAPI?.aider) {
          aiderAvailable = await (window as any).electronAPI.aider.checkAvailability();
        }
      } catch {}
      aiderAvailableRef.current = aiderAvailable;
      if (!isClaudeAvailable) {
        terminal.write('\x1b[1;31m⚠ Warning: Claude Code CLI not found in PATH\x1b[0m\r\n');
        terminal.write('\x1b[1;33mTip: Install Claude Code CLI to use direct commands\x1b[0m\r\n\r\n');
      } else {
        terminal.write('\x1b[1;32m✓ Claude Code CLI detected and ready\x1b[0m\r\n\r\n');
      }
      if (!aiderAvailable) {
        terminal.write('\x1b[1;31m⚠ Aider CLI not found in PATH\x1b[0m\r\n');
        terminal.write('\x1b[1;33mInstall: pip install aider-install && aider-install\x1b[0m\r\n\r\n');
      } else {
        terminal.write('\x1b[1;32m✓ Aider CLI detected and ready\x1b[0m\r\n\r\n');
      }

      // Show a simple prompt
      terminal.write('\x1b[1;32mprestige>\x1b[0m ');

    } catch (error) {
      console.error('Failed to start shell process:', error);
      terminal.write(`\x1b[1;31m✗ Failed to start shell: ${error}\x1b[0m\r\n`);
    }
  };

  const executeCommand = async (command: string, terminal: Terminal) => {
    if (!sessionId.current) {
      terminal.write('Terminal session not available\r\n');
      terminal.write('\x1b[1;32mprestige>\x1b[0m ');
      return;
    }

    // Send command to the shell process
    window.electronAPI?.terminal.write(sessionId.current, command + '\n');
    
    // Note: Output will come through the onData handler
    // We don't show a new prompt here because the shell will handle it
  };

  const handleSpecialCommand = (command: string, terminal: Terminal): boolean => {
    const cmd = command.toLowerCase();
    
    switch (cmd) {
      case 'fix-errors':
      case 'fix':
        // Check for errors from preview panel
        const errorPrompt = (window as any).prestigeErrorPrompt;
        if (errorPrompt) {
          terminal.write('\x1b[1;32m🔧 Executing fix command with preview panel errors...\x1b[0m\r\n');
          const escaped = errorPrompt.replace(/"/g, '\\"');
          const fixCommand = claudeAvailableRef.current
            ? `claude "${escaped}"`
            : aiderAvailableRef.current
              ? `aider "${escaped}"`
              : '';
          if (!fixCommand) {
            terminal.write('\x1b[1;31m✗ Neither Claude Code nor Aider CLI available for fix\x1b[0m\r\n');
            return true;
          }
          if (sessionId.current) {
            // Send the claude command directly
            window.electronAPI?.terminal.write(sessionId.current, fixCommand + '\n');
          }
          // Clear the stored error prompt
          delete (window as any).prestigeErrorPrompt;
          return true;
        } else if (errorReport?.hasErrors) {
          // Use current terminal errors
          terminal.write('\x1b[1;32m🔧 Executing fix command with detected errors...\x1b[0m\r\n');
          const currentErrorPrompt = errorService.generateErrorFixPrompt(errorReport);
          const escaped2 = currentErrorPrompt.replace(/"/g, '\\"');
          const fixCommand = claudeAvailableRef.current
            ? `claude "${escaped2}"`
            : aiderAvailableRef.current
              ? `aider "${escaped2}"`
              : '';
          if (!fixCommand) {
            terminal.write('\x1b[1;31m✗ Neither Claude Code nor Aider CLI available for fix\x1b[0m\r\n');
            return true;
          }
          if (sessionId.current) {
            window.electronAPI?.terminal.write(sessionId.current, fixCommand + '\n');
          }
          setErrorReport(null); // Clear errors after attempting fix
          return true;
        } else {
          terminal.write('\x1b[1;33m⚠ No errors detected to fix. Run your app or check the preview panel for errors.\x1b[0m\r\n');
          return true;
        }
        
      case 'help':
      case 'prestige-help':
        terminal.write('\x1b[1;36m📖 Prestige AI Terminal Help\x1b[0m\r\n');
        terminal.write('\x1b[1;32m' + '='.repeat(40) + '\x1b[0m\r\n');
        terminal.write('\x1b[1;33mSpecial Commands:\x1b[0m\r\n');
        terminal.write('  fix, fix-errors    - Auto-fix detected errors using Claude Code\r\n');
        terminal.write('  prestige-help      - Show this help message\r\n');
        terminal.write('  clear-errors       - Clear current error report\r\n');
        terminal.write('\r\n');
  terminal.write('\x1b[1;33mClaude Code Commands:\x1b[0m\r\n');
  terminal.write('  claude "message"   - Send message to Claude Code CLI\r\n');
  terminal.write('  claude --help      - Show Claude Code help\r\n');
  terminal.write('\x1b[1;33mAider Commands:\x1b[0m\r\n');
  terminal.write('  aider --model deepseek --api-key deepseek=<key> "prompt"\r\n');
  terminal.write('  aider --model sonnet --api-key anthropic=<key> "prompt"\r\n');
  terminal.write('  aider --model o3-mini --api-key openai=<key> "prompt"\r\n');
  terminal.write('  aider --model gemini "prompt" (uses configured key)\r\n');
        terminal.write('\r\n');
        terminal.write('\x1b[1;33mTips:\x1b[0m\r\n');
        terminal.write('  • Run your app in Preview mode to detect build errors\r\n');
        terminal.write('  • Use "Send to Terminal" button in preview panel\r\n');
        terminal.write('  • All regular shell commands work normally\r\n');
        terminal.write('\x1b[1;32m' + '='.repeat(40) + '\x1b[0m\r\n');
        return true;
        
      case 'clear-errors':
        setErrorReport(null);
        delete (window as any).prestigeErrorPrompt;
        terminal.write('\x1b[1;32m✓ Error report cleared\x1b[0m\r\n');
        return true;
        
      default:
        return false; // Not a special command, let shell handle it
    }
  };

  const monitorForErrors = (output: string) => {
    if (!currentApp) return;

    // Create a mock output object for error parsing
    const mockOutput = {
      type: 'stderr' as const,
      message: output,
      timestamp: Date.now(),
      appId: currentApp.id
    };

    // Check for errors in the output
    const report = errorService.createErrorReport([mockOutput], []);
    
    if (report.hasErrors && report.buildErrors.length > 0) {
      setErrorReport(report);
      
      // Show error indicator in terminal
      if (terminalInstance.current) {
        terminalInstance.current.write(
          `\r\n\x1b[1;31m🔥 Detected ${report.buildErrors.length} error(s). Type 'fix' to auto-resolve.\x1b[0m\r\n`
        );
      }
    }
  };

  const handleClear = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
    }
  };

  const handleCopyErrors = async () => {
    if (!errorReport) {
      showToast('No errors to copy', 'info');
      return;
    }

    try {
      const errorPrompt = errorService.generateErrorFixPrompt(errorReport);
      await navigator.clipboard.writeText(errorPrompt);
      showToast(`Copied ${errorReport.buildErrors.length} error(s) to clipboard`, 'success');
    } catch (error) {
      showToast('Failed to copy errors', 'error');
    }
  };

  const sendFixCommand = () => {
    if (!errorReport || !sessionId.current) {
      showToast('No errors to fix or terminal not ready', 'info');
      return;
    }

    const errorPrompt = errorService.generateErrorFixPrompt(errorReport);
    const escaped = errorPrompt.replace(/"/g, '\\"');
    const fixCommand = claudeAvailableRef.current
      ? `claude "${escaped}"`
      : aiderAvailableRef.current
        ? `aider "${escaped}"`
        : '';
    if (!fixCommand) {
      showToast('No CLI (Claude/Aider) available for fixing', 'error');
      return;
    }
    window.electronAPI?.terminal.write(sessionId.current, fixCommand + '\n');
    
    // Clear the error report since we're attempting to fix
    setErrorReport(null);
    
    // Show notification that command was sent
    if (terminalInstance.current) {
      terminalInstance.current.write('\r\n\x1b[1;32m🔧 Fix command sent to terminal...\x1b[0m\r\n');
    }
  };

  return (
    <Card className="flex-1 flex flex-col h-full bg-[#1a1a1a] border-gray-700">
      <CardHeader className="flex-shrink-0 border-b border-gray-700 bg-[#1a1a1a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Direct Terminal</h3>
              <p className="text-sm text-gray-400">
                Native shell with Claude Code CLI integration
                {currentApp && ` • ${currentApp.name}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {errorReport?.hasErrors && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendFixCommand}
                  className="h-8 px-3 text-orange-400 hover:text-orange-300 hover:bg-gray-800"
                  title={`Auto-fix ${errorReport.buildErrors.length} error(s)`}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Fix ({errorReport.buildErrors.length})
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyErrors}
                  className="h-8 px-3 text-gray-400 hover:text-white hover:bg-gray-800"
                  title="Copy error summary to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </>
            )}
            
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
              title="Exit Terminal Mode"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 bg-[#1a1a1a]">
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