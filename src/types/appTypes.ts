export interface AppOutput {
  message: string;
  type: 'stdout' | 'stderr';
  appId: number;
  timestamp: number;
}

export interface AppUrlObj {
  appUrl: string | null;
  appId: number | null;
  originalUrl: string | null;
}

export interface AppError {
  type: 'window-error' | 'unhandled-rejection' | 'build-error-report' | 'navigation-error' | 'iframe-sourcemapped-error';
  payload: {
    message: string;
    stack?: string;
    file?: string;
    frame?: string;
    originalSourceType?: string;
    operation?: string;
    error?: string;
    stateAttempted?: any;
    urlAttempted?: string;
  };
  timestamp: number;
  appId: number;
}

