import { create } from 'zustand';
export const useProblemsStore = create((set, get) => ({
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
        const newReport = {
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
        if (!currentReport)
            return;
        // Remove problems for the changed file and trigger re-scan
        const filteredProblems = currentReport.problems.filter(p => p.file !== fileChanged);
        const newReport = {
            problems: filteredProblems,
            timestamp: Date.now(),
            totalErrors: filteredProblems.filter(p => p.severity === 'error').length,
            totalWarnings: filteredProblems.filter(p => p.severity === 'warning').length,
        };
        set({ currentReport: newReport, lastScanTimestamp: Date.now() });
    },
}));
