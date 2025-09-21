import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Database, PlugZap } from "lucide-react";
import { IntegrationSetupDialog } from "@/components/dialogs/IntegrationSetupDialog";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";

export const PrestigePromptDbConnectBlock: React.FC<PrestigeBlockProps> = ({ children, node }) => {
  const state = (node?.properties?.state as PrestigeBlockState) || "finished";
  const [openProvider, setOpenProvider] = useState<null | 'mongodb' | 'supabase'>(null);

  return (
    <div className="my-3">
      <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
        <PlugZap className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          <div className="space-y-3">
            <div className="font-medium text-yellow-800 dark:text-yellow-200">
              Database connection required
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              {children || 'This operation requires a connected database. Please connect MongoDB or Supabase to continue.'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setOpenProvider('mongodb')}>
                <Database className="w-4 h-4 mr-2" />
                Connect MongoDB
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenProvider('supabase')}>
                <Database className="w-4 h-4 mr-2" />
                Connect Supabase
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <IntegrationSetupDialog
        isOpen={openProvider !== null}
        onClose={() => setOpenProvider(null)}
        provider={(openProvider || 'mongodb') as 'github' | 'supabase' | 'mongodb' | 'vercel'}
        onSuccess={() => setOpenProvider(null)}
      />
    </div>
  );
};
