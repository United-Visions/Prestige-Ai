import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { ErrorDetectionService } from '@/services/errorDetectionService';
import { showToast } from '@/utils/toast';
export function RealTerminal({ onClose }) {
    const terminalRef = useRef(null);
    const terminalInstance = useRef(null);
    const fitAddon = useRef(null);
    const sessionId = useRef(null);
    const claudeAvailableRef = useRef(false);
    const aiderAvailableRef = useRef(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [errorReport, setErrorReport] = useState(null);
    const { currentApp } = useAppStore();
    const errorService = ErrorDetectionService.getInstance();
    useEffect(() => {
        if (!terminalRef.current || isInitialized)
            return;
        const initializeTerminal = () => {
            const container = terminalRef.current;
            if (!container)
                return;
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
                }
                catch (error) {
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
                        }
                        catch (error) {
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
                terminal._cleanup = cleanup;
            });
        };
        initializeTerminal();
        setIsInitialized(true);
        return () => {
            if (terminalInstance.current && terminalInstance.current._cleanup) {
                terminalInstance.current._cleanup();
            }
        };
    }, [isInitialized, currentApp]);
    const startShellProcess = async (terminal) => {
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
            // Handle terminal input - pass all data directly to the real shell
            terminal.onData((data) => {
                if (!sessionId.current)
                    return;
                // Intercept special commands before sending to shell
                if (data === '\r') {
                    // For special commands, we'll let them execute normally in the shell
                    // and handle them via command monitoring in the output
                }
                // Send all input directly to the shell process
                window.electronAPI?.terminal.write(sessionId.current, data);
            });
            // Handle terminal output
            window.electronAPI?.terminal.onData(sessionResult.sessionId, (data) => {
                // Check for special command patterns in the output
                const lines = data.split('\n');
                let modifiedData = data;
                for (const line of lines) {
                    const cmd = line.trim().toLowerCase();
                    if (cmd === 'fix' || cmd === 'fix-errors') {
                        // Inject our fix command implementation
                        const fixResult = handleSpecialCommand('fix', terminal);
                        if (fixResult) {
                            // Don't write the original command, we handled it
                            modifiedData = modifiedData.replace(line, '');
                        }
                    }
                    else if (cmd === 'prestige-help' || cmd === 'help') {
                        const helpResult = handleSpecialCommand('prestige-help', terminal);
                        if (helpResult) {
                            modifiedData = modifiedData.replace(line, '');
                        }
                    }
                    else if (cmd === 'clear-errors') {
                        const clearResult = handleSpecialCommand('clear-errors', terminal);
                        if (clearResult) {
                            modifiedData = modifiedData.replace(line, '');
                        }
                    }
                }
                terminal.write(modifiedData);
                // Monitor for errors in real-time
                monitorForErrors(data);
            });
            // Handle terminal exit
            window.electronAPI?.terminal.onExit(sessionResult.sessionId, (exitCode) => {
                terminal.write(`\r\n\x1b[1;36m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
                sessionId.current = null;
            });
            // The electron backend will send its own PTY welcome message
            // We'll receive it through the terminal data handler
            // Check Claude Code and Aider availability in background
            const isClaudeAvailable = await window.electronAPI?.terminal.checkClaudeAvailability();
            claudeAvailableRef.current = !!isClaudeAvailable;
            let aiderAvailable = false;
            try {
                if (window.electronAPI?.aider) {
                    aiderAvailable = await window.electronAPI.aider.checkAvailability();
                }
            }
            catch { }
            aiderAvailableRef.current = aiderAvailable;
            // Add a small delay to let the PTY welcome message display first
            setTimeout(() => {
                terminal.write('\r\n\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
                terminal.write('\x1b[1;32m    Prestige AI Enhanced Terminal (Full Shell + AI)\x1b[0m\r\n');
                terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
                terminal.write('\x1b[1;33mEnhanced Commands:\x1b[0m\r\n');
                terminal.write('  \x1b[1;36mfix\x1b[0m               - Auto-fix detected errors (Claude/Aider)\r\n');
                terminal.write('  \x1b[1;36mprestige-help\x1b[0m     - Show all enhanced commands\r\n');
                terminal.write('  \x1b[1;36mclaude "prompt"\x1b[0m   - Direct Claude Code CLI\r\n');
                terminal.write('  \x1b[1;36maider "prompt"\x1b[0m    - Direct Aider CLI\r\n');
                terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
                terminal.write('\x1b[1;33mNote: This is a full native shell with tab completion, history, and all shell features!\x1b[0m\r\n');
                terminal.write('\x1b[1;32m' + '='.repeat(60) + '\x1b[0m\r\n');
                if (!isClaudeAvailable) {
                    terminal.write('\x1b[1;31m⚠ Warning: Claude Code CLI not found in PATH\x1b[0m\r\n');
                }
                else {
                    terminal.write('\x1b[1;32m✓ Claude Code CLI ready\x1b[0m\r\n');
                }
                if (!aiderAvailable) {
                    terminal.write('\x1b[1;31m⚠ Aider CLI not found in PATH\x1b[0m\r\n');
                }
                else {
                    terminal.write('\x1b[1;32m✓ Aider CLI ready\x1b[0m\r\n');
                }
                terminal.write('\r\n');
            }, 1000);
        }
        catch (error) {
            console.error('Failed to start shell process:', error);
            terminal.write(`\x1b[1;31m✗ Failed to start shell: ${error}\x1b[0m\r\n`);
        }
    };
    // This function is no longer needed since we pass all data directly to the shell
    // Keeping it for potential future use
    const executeCommand = async (command, terminal) => {
        if (!sessionId.current) {
            return;
        }
        // Commands are now handled directly through the shell
        window.electronAPI?.terminal.write(sessionId.current, command + '\n');
    };
    const handleSpecialCommand = (command, terminal) => {
        const cmd = command.toLowerCase();
        switch (cmd) {
            case 'fix-errors':
            case 'fix':
                // Check for errors from preview panel
                const errorPrompt = window.prestigeErrorPrompt;
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
                    delete window.prestigeErrorPrompt;
                    return true;
                }
                else if (errorReport?.hasErrors) {
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
                }
                else {
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
                terminal.write('  switch-ai          - Toggle fix preference (Claude ⇄ Aider)\r\n');
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
                terminal.write('  • This is a REAL shell with full features: tab completion, history, pipes, etc.\r\n');
                terminal.write('  • Run your app in Preview mode to detect build errors\r\n');
                terminal.write('  • Use "Send to Terminal" button in preview panel\r\n');
                terminal.write('  • Use Ctrl+C, Ctrl+Z, and all standard terminal shortcuts\r\n');
                terminal.write('  • Navigate with up/down arrows for command history\r\n');
                terminal.write('\x1b[1;32m' + '='.repeat(40) + '\x1b[0m\r\n');
                return true;
            case 'clear-errors':
                setErrorReport(null);
                delete window.prestigeErrorPrompt;
                terminal.write('\x1b[1;32m✓ Error report cleared\x1b[0m\r\n');
                return true;
            case 'switch-ai': {
                try {
                    const store = require('@/stores/aiderStore').useAiderStore.getState();
                    store.setPreferAider(!store.preferAider);
                    terminal.write(`\x1b[1;32mAI fix preference set to: ${store.preferAider ? 'Aider first' : 'Claude first'}\x1b[0m\r\n`);
                }
                catch (e) {
                    terminal.write('\x1b[1;31mFailed to toggle preference\x1b[0m\r\n');
                }
                return true;
            }
            default:
                return false; // Not a special command, let shell handle it
        }
    };
    const monitorForErrors = (output) => {
        if (!currentApp)
            return;
        // Create a mock output object for error parsing
        const mockOutput = {
            type: 'stderr',
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
                terminalInstance.current.write(`\r\n\x1b[1;31m🔥 Detected ${report.buildErrors.length} error(s). Type 'fix' to auto-resolve.\x1b[0m\r\n`);
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
        }
        catch (error) {
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
        const aiderArgs = (aiderAvailableRef.current && window.electronAPI?.aider) ? require('@/stores/aiderStore').useAiderStore.getState().getCliArgs() : {};
        const aiderPrefix = aiderArgs.model ? `aider --model ${aiderArgs.model}${aiderArgs.apiKeySpec ? ' --api-key ' + aiderArgs.apiKeySpec : ''}` : 'aider';
        const store = (aiderAvailableRef.current && window.electronAPI?.aider) ? require('@/stores/aiderStore').useAiderStore.getState() : null;
        const preferAider = store?.preferAider;
        let fixCommand = '';
        if (preferAider) {
            if (aiderAvailableRef.current)
                fixCommand = `${aiderPrefix} "${escaped}"`;
            else if (claudeAvailableRef.current)
                fixCommand = `claude "${escaped}"`;
        }
        else {
            if (claudeAvailableRef.current)
                fixCommand = `claude "${escaped}"`;
            else if (aiderAvailableRef.current)
                fixCommand = `${aiderPrefix} "${escaped}"`;
        }
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
    return (_jsxs(Card, { className: "flex-1 flex flex-col h-full bg-[#1a1a1a] border-gray-700", children: [_jsx(CardHeader, { className: "flex-shrink-0 border-b border-gray-700 bg-[#1a1a1a]", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TerminalIcon, { className: "w-5 h-5 text-blue-400" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Enhanced Terminal" }), _jsxs("p", { className: "text-sm text-gray-400", children: ["Full native shell with PTY + AI integration \u2022 Tab completion \u2022 Command history", currentApp && ` • ${currentApp.name}`] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [errorReport?.hasErrors && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: sendFixCommand, className: "h-8 px-3 text-orange-400 hover:text-orange-300 hover:bg-gray-800", title: `Auto-fix ${errorReport.buildErrors.length} error(s)`, children: [_jsx(AlertTriangle, { className: "w-4 h-4 mr-1" }), "Fix (", errorReport.buildErrors.length, ")"] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCopyErrors, className: "h-8 px-3 text-gray-400 hover:text-white hover:bg-gray-800", title: "Copy error summary to clipboard", children: _jsx(Copy, { className: "w-4 h-4" }) })] })), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleClear, className: "h-8 px-3 text-gray-300 hover:text-white hover:bg-gray-700", title: "Clear Terminal", children: _jsx(RefreshCw, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onClose, className: "h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700", title: "Exit Terminal Mode", children: _jsx(X, { className: "w-4 h-4" }) })] })] }) }), _jsx(CardContent, { className: "flex-1 flex flex-col p-0 bg-[#1a1a1a]", children: _jsx("div", { ref: terminalRef, className: "flex-1 bg-[#1a1a1a] relative", style: {
                        minHeight: '400px',
                        minWidth: '600px',
                        width: '100%',
                        height: '100%',
                        padding: '16px',
                        display: 'block',
                        visibility: 'visible',
                        opacity: 1
                    } }) })] }));
}
