import { useState, useEffect } from 'react';
import { processManager } from '../services/processManager';
export function usePreview() {
    const [state, setState] = useState({
        isVisible: false,
        appId: null,
        url: null,
        status: 'idle',
        output: []
    });
    useEffect(() => {
        const handleOutput = (output) => {
            setState(prev => ({
                ...prev,
                output: [...prev.output.slice(-100), output] // Keep last 100 messages
            }));
            // Look for dev server URL in output
            if (output.type === 'stdout' && output.appId === state.appId) {
                const urlMatch = output.message.match(/(?:Local:|http:\/\/localhost:)(\d+)/);
                if (urlMatch) {
                    const port = urlMatch[1];
                    const url = `http://localhost:${port}`;
                    setState(prev => ({
                        ...prev,
                        url,
                        status: 'running'
                    }));
                }
            }
        };
        processManager.onOutput(handleOutput);
    }, [state.appId]);
    const startPreview = async (appId, appPath) => {
        setState(prev => ({
            ...prev,
            isVisible: true,
            appId,
            status: 'starting',
            error: undefined,
            output: []
        }));
        try {
            await processManager.startApp(appId, appPath);
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    };
    const stopPreview = async () => {
        if (state.appId) {
            await processManager.stopApp(state.appId);
        }
        setState({
            isVisible: false,
            appId: null,
            url: null,
            status: 'idle',
            output: []
        });
    };
    const restartPreview = async (appPath) => {
        if (state.appId) {
            setState(prev => ({ ...prev, status: 'starting' }));
            try {
                await processManager.restartApp(state.appId, appPath);
            }
            catch (error) {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        }
    };
    const rebuildPreview = async (appPath) => {
        if (state.appId) {
            setState(prev => ({ ...prev, status: 'starting', output: [] }));
            try {
                await processManager.rebuildApp(state.appId, appPath);
            }
            catch (error) {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        }
    };
    const togglePreview = () => {
        setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
    };
    return {
        ...state,
        startPreview,
        stopPreview,
        restartPreview,
        rebuildPreview,
        togglePreview
    };
}
