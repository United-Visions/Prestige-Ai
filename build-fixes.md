
> prestige-ai@0.1.0 build /Users/deion/Downloads/CCdyad-main/Prestige-Ai
> tsc && vite build && electron-builder

src/components/apps/AppSidebar.tsx:19:9 - error TS6198: All destructured elements are unused.

19   const {
           ~
20     setPreviewApp,
   ~~~~~~~~~~~~~~~~~~
21     setPreviewVisible
   ~~~~~~~~~~~~~~~~~~~~~
22   } = useAIStore();
   ~~~

src/components/chat/ChatInterface.tsx:401:51 - error TS2554: Expected 0 arguments, but got 1.

401                   onClick={() => handlePreviewApp(currentApp)}
                                                      ~~~~~~~~~~

src/components/demo/ProblemPanelDemo.tsx:92:55 - error TS18046: 'error' is of type 'unknown'.

92         logger.error('Code analysis failed', { error: error.message });
                                                         ~~~~~

src/components/logs/LogsPreview.tsx:2:46 - error TS6133: 'logger' is declared but its value is never read.

2 import { LogEntry, LogLevel, LoggingService, logger } from '../../services/loggingService';
                                               ~~~~~~

src/components/problems/ProblemsPanel.tsx:160:10 - error TS6133: 'selectedProblem' is declared but its value is never read.

160   const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
             ~~~~~~~~~~~~~~~

src/hooks/useRealTimeErrorDetection.ts:1:10 - error TS6133: 'useEffect' is declared but its value is never read.

1 import { useEffect, useCallback } from 'react';
           ~~~~~~~~~

src/hooks/useRealTimeErrorDetection.ts:67:5 - error TS6133: 'fullCode' is declared but its value is never read.

67     fullCode: string,
       ~~~~~~~~

src/services/aiProblemDetector.ts:104:60 - error TS1016: A required parameter cannot follow an optional parameter.

104   private buildUserPrompt(code: string, filePath?: string, language: string): string {
                                                               ~~~~~~~~

src/services/aiStreamingService.ts:10:11 - error TS6133: 'streamingCallbacks' is declared but its value is never read.

10   private streamingCallbacks: Map<string, Function[]> = new Map();
             ~~~~~~~~~~~~~~~~~~

src/services/aiStreamingService.ts:131:5 - error TS6133: 'fullResponse' is declared but its value is never read.

131     fullResponse: string,
        ~~~~~~~~~~~~

src/services/aiStreamingService.ts:132:5 - error TS6133: 'filePath' is declared but its value is never read.

132     filePath?: string,
        ~~~~~~~~

src/services/aiStreamingService.ts:154:5 - error TS6133: 'affectedFiles' is declared but its value is never read.

154     affectedFiles: string[],
        ~~~~~~~~~~~~~

src/services/aiStreamingService.ts:174:5 - error TS6133: 'prompt' is declared but its value is never read.

174     prompt: string,
        ~~~~~~

src/services/aiStreamingService.ts:260:15 - error TS2339: Property 'onAutoFixNeeded' does not exist on type '{ onChunk?: ((chunk: string, fullResponse: string) => void) | undefined; onError?: ((error: Error) => void) | undefined; onComplete?: ((response: string) => void) | undefined; enableAutoFix?: boolean | undefined; affectedFiles?: string[] | undefined; }'.

260       options.onAutoFixNeeded
                  ~~~~~~~~~~~~~~~


Found 14 errors in 8 files.

Errors  Files
     1  src/components/apps/AppSidebar.tsx:19
     1  src/components/chat/ChatInterface.tsx:401
     1  src/components/demo/ProblemPanelDemo.tsx:92
     1  src/components/logs/LogsPreview.tsx:2
     1  src/components/problems/ProblemsPanel.tsx:160
     2  src/hooks/useRealTimeErrorDetection.ts:1
     1  src/services/aiProblemDetector.ts:104
     6  src/services/aiStreamingService.ts:10
 ELIFECYCLE  Command failed with exit code 2.
deion@Dectricks-MacBook-Pro Prestige-Ai % 



^C%                                               
deion@Dectricks-MacBook-Pro CCdyad-main % cd /User
s/deion/Downloads/CCdyad-main/Prestige-Ai && pnpm 
run build

> prestige-ai@0.1.0 build /Users/deion/Downloads/CCdyad-main/Prestige-Ai
> tsc && vite build && electron-builder

src/components/apps/AppSidebar.tsx:2:1 - error TS6133: 'useAIStore' is declared but its value is never read.

2 import { useAIStore } from '@/store/aiStore';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


Found 1 error in src/components/apps/AppSidebar.tsx:2

 ELIFECYCLE  Command failed with exit code 2.
deion@Dectricks-MacBook-Pro Prestige-Ai % 
