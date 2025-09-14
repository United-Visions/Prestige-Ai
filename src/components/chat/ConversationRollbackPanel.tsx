import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConversationRollbackService, type ConversationSnapshot } from '@/services/conversationRollbackService';
import { History, RotateCcw, Trash2, FileText, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface ConversationRollbackPanelProps {
  conversationId: number;
  appId: number;
  isOpen: boolean;
  onClose: () => void;
  onRollback?: (snapshotId: string) => void;
}

export function ConversationRollbackPanel({
  conversationId,
  appId,
  isOpen,
  onClose,
  onRollback
}: ConversationRollbackPanelProps) {
  const [snapshots, setSnapshots] = useState<ConversationSnapshot[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState<string | null>(null);
  const rollbackService = ConversationRollbackService.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, conversationId]);

  const loadSnapshots = () => {
    const conversationSnapshots = rollbackService.getConversationSnapshots(conversationId);
    setSnapshots(conversationSnapshots);
  };

  const handleRollback = async (snapshotId: string) => {
    if (!confirmRollback) {
      setConfirmRollback(snapshotId);
      return;
    }

    setIsRollingBack(true);
    try {
      const result = await rollbackService.rollbackToSnapshot(snapshotId);
      
      if (result.success) {
        showToast(
          `✅ Rollback successful: ${result.filesRestored} files restored, ${result.messagesRemoved} messages removed`,
          'success'
        );
        
        // Refresh snapshots list
        loadSnapshots();
        
        // Notify parent component
        onRollback?.(snapshotId);
        
        // Close dialog
        onClose();
      } else {
        showToast(`❌ Rollback failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Rollback error:', error);
      showToast('❌ Rollback failed: Unexpected error', 'error');
    } finally {
      setIsRollingBack(false);
      setConfirmRollback(null);
    }
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const deleted = rollbackService.deleteSnapshot(snapshotId);
    if (deleted) {
      showToast('Snapshot deleted', 'success');
      loadSnapshots();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <span>Conversation Version History</span>
          </DialogTitle>
          <DialogDescription>
            Rollback to any point in this conversation. This will restore all file changes and remove subsequent messages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {snapshots.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Snapshots Available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Snapshots are automatically created before AI responses to track file changes.
                </p>
                <p className="text-xs text-gray-400">
                  Continue chatting to create version history.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto space-y-3 pr-2">
              {snapshots.map((snapshot, index) => (
                <Card key={snapshot.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-blue-200">
                          <span className="text-sm font-bold text-blue-600">
                            #{snapshots.length - index}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{snapshot.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(snapshot.timestamp)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {snapshot.messageCount} messages
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {snapshot.fileSnapshots.length} files
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {confirmRollback === snapshot.id ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Confirm rollback?</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmRollback(null)}
                              className="h-8 px-3 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRollback(snapshot.id)}
                              disabled={isRollingBack}
                              className="h-8 px-3 text-xs"
                            >
                              {isRollingBack ? 'Rolling back...' : 'Confirm'}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSnapshot(snapshot.id)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleRollback(snapshot.id)}
                              disabled={isRollingBack}
                              className="h-8 px-4 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Rollback
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {snapshot.fileSnapshots.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600 mb-2">Files in this snapshot:</div>
                        <div className="flex flex-wrap gap-1">
                          {snapshot.fileSnapshots.slice(0, 8).map((file, fileIndex) => (
                            <span
                              key={fileIndex}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-mono"
                            >
                              <FileText className="w-3 h-3" />
                              {file.path.split('/').pop()}
                            </span>
                          ))}
                          {snapshot.fileSnapshots.length > 8 && (
                            <span className="px-2 py-1 bg-gray-50 text-gray-400 rounded-md text-xs">
                              +{snapshot.fileSnapshots.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            ⚠️ Rollbacks are permanent and cannot be undone. Files will be restored and messages will be deleted.
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}