import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PrestigeProcessSummaryProps {
  children: React.ReactNode;
  title?: string;
  isCompleted?: boolean;
}

export function PrestigeProcessSummary({
  children,
  title = "AI Process Summary",
  isCompleted = true
}: PrestigeProcessSummaryProps) {
  return (
    <div className="mt-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        {isCompleted ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Clock className="w-4 h-4 text-blue-500 animate-spin" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </span>
        {isCompleted && (
          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
            Completed
          </span>
        )}
      </div>

      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent">
        <CardContent className="p-4">
          <div className="space-y-3">
            {children}
          </div>

          {isCompleted && (
            <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span>All operations completed successfully</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}