import { Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewTabProps {
  isRunning?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  currentAppName?: string;
  className?: string;
}

export function PreviewTab({
  isRunning = false,
  isOpen = false,
  onClick,
  currentAppName = 'App',
  className = ''
}: PreviewTabProps) {
  return (
    <div className={`fixed top-1/2 right-0 -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-0'
    } ${className}`}>
      <Button
        onClick={onClick}
        className={`
          h-32 w-12 rounded-l-2xl rounded-r-none
          bg-gradient-to-b from-blue-500/90 via-purple-500/90 to-pink-500/90
          hover:from-blue-600/90 hover:via-purple-600/90 hover:to-pink-600/90
          text-white shadow-2xl border-0
          flex flex-col items-center justify-center gap-2
          transition-all duration-300 ease-in-out
          ${isOpen ? 'shadow-inner' : 'hover:translate-x-[-4px] hover:shadow-2xl'}
          ${isRunning ? 'animate-pulse' : ''}
        `}
        title={`${isOpen ? 'Close' : 'Open'} ${currentAppName} Preview`}
      >
        {/* App Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${
          isRunning ? 'bg-green-300 animate-pulse' : 'bg-gray-300'
        }`} />

        {/* Icon */}
        {isRunning ? (
          <Play className="w-5 h-5" />
        ) : (
          <Square className="w-5 h-5" />
        )}

        {/* Vertical Text */}
        <div className="writing-vertical text-xs font-medium tracking-wider">
          PREVIEW
        </div>
      </Button>
    </div>
  );
}