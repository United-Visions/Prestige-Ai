import { create } from 'zustand';

export interface Problem {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ProblemReport {
  problems: Problem[];
  timestamp: number;
  totalErrors: number;
  totalWarnings: number;
}

interface ProblemsState {
  currentReport: ProblemReport | null;
  isScanning: boolean;
  autoFixEnabled: boolean;
  lastScanTimestamp: number;
  
  // Actions
  setCurrentReport: (report: ProblemReport | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setAutoFixEnabled: (enabled: boolean) => void;
  addProblems: (problems: Problem[]) => void;
  clearProblems: () => void;
  updateProblemStatus: (fileChanged: string) => void;
}

export const useProblemsStore = create<ProblemsState>((set, get) => ({
  currentReport: null,
  isScanning: false,
  autoFixEnabled: false,
  lastScanTimestamp: 0,

  setCurrentReport: (report) => set({ 
    currentReport: report,
    lastScanTimestamp: Date.now() 
  }),

  setIsScanning: (scanning) => set({ isScanning: scanning }),

  setAutoFixEnabled: (enabled) => set({ autoFixEnabled: enabled }),

  addProblems: (problems) => {
    const { currentReport } = get();
    const newReport: ProblemReport = {
      problems: [...(currentReport?.problems || []), ...problems],
      timestamp: Date.now(),
      totalErrors: problems.filter(p => p.severity === 'error').length + (currentReport?.totalErrors || 0),
      totalWarnings: problems.filter(p => p.severity === 'warning').length + (currentReport?.totalWarnings || 0),
    };
    set({ currentReport: newReport, lastScanTimestamp: Date.now() });
  },

  clearProblems: () => set({ 
    currentReport: { 
      problems: [], 
      timestamp: Date.now(), 
      totalErrors: 0, 
      totalWarnings: 0 
    },
    lastScanTimestamp: Date.now()
  }),

  updateProblemStatus: (fileChanged) => {
    const { currentReport } = get();
    if (!currentReport) return;
    
    // Remove problems for the changed file and trigger re-scan
    const filteredProblems = currentReport.problems.filter(p => p.file !== fileChanged);
    const newReport: ProblemReport = {
      problems: filteredProblems,
      timestamp: Date.now(),
      totalErrors: filteredProblems.filter(p => p.severity === 'error').length,
      totalWarnings: filteredProblems.filter(p => p.severity === 'warning').length,
    };
    set({ currentReport: newReport, lastScanTimestamp: Date.now() });
  },
}));