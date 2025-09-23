import { vercelService } from './vercelService';
import { showInfo, showSuccess, showError } from '@/utils/toast';

export interface DeploymentStatus {
  id: string;
  appId: number;
  projectId: string;
  status: 'building' | 'ready' | 'error' | 'canceled';
  url?: string;
  createdAt: number;
  updatedAt: number;
  buildLogs?: string[];
  error?: string;
}

export class DeploymentStatusService {
  private static instance: DeploymentStatusService;
  private deployments: Map<string, DeploymentStatus> = new Map();
  private statusListeners: Map<string, (status: DeploymentStatus) => void> = new Map();

  public static getInstance(): DeploymentStatusService {
    if (!DeploymentStatusService.instance) {
      DeploymentStatusService.instance = new DeploymentStatusService();
    }
    return DeploymentStatusService.instance;
  }

  /**
   * Start tracking a deployment
   */
  async trackDeployment(appId: number, projectId: string, deploymentId: string): Promise<void> {
    const deployment: DeploymentStatus = {
      id: deploymentId,
      appId,
      projectId,
      status: 'building',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.deployments.set(deploymentId, deployment);
    this.notifyListeners(deploymentId, deployment);

    // Start polling for status updates
    this.startPolling(deploymentId);
  }

  /**
   * Start polling for deployment status
   */
  private async startPolling(deploymentId: string): Promise<void> {
    const pollInterval = 5000; // 5 seconds
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes total

    const poll = async () => {
      attempts++;
      
      try {
        const deployment = this.deployments.get(deploymentId);
        if (!deployment) {
          return; // Deployment was removed
        }

        // Get latest deployment status from Vercel
        const deployments = await vercelService.getProjectDeployments(deployment.projectId);
        const latestDeployment = deployments.find(d => d.uid === deploymentId);

        if (latestDeployment) {
          const updatedStatus: DeploymentStatus = {
            ...deployment,
            status: this.mapVercelStatus(latestDeployment.state),
            url: latestDeployment.url,
            updatedAt: Date.now(),
          };

          this.deployments.set(deploymentId, updatedStatus);
          this.notifyListeners(deploymentId, updatedStatus);

          // Stop polling if deployment is complete
          if (updatedStatus.status === 'ready' || updatedStatus.status === 'error') {
            this.onDeploymentComplete(updatedStatus);
            return;
          }
        }

        // Continue polling if not complete and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          // Timeout - mark as error
          const timeoutStatus: DeploymentStatus = {
            ...deployment,
            status: 'error',
            error: 'Deployment polling timeout',
            updatedAt: Date.now(),
          };
          
          this.deployments.set(deploymentId, timeoutStatus);
          this.notifyListeners(deploymentId, timeoutStatus);
        }

      } catch (error) {
        console.error('Deployment polling error:', error);
        
        // Continue polling on error (might be temporary)
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        }
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);
  }

  /**
   * Map Vercel deployment status to our status
   */
  private mapVercelStatus(vercelStatus: string): DeploymentStatus['status'] {
    switch (vercelStatus.toLowerCase()) {
      case 'ready':
        return 'ready';
      case 'error':
        return 'error';
      case 'canceled':
        return 'canceled';
      case 'building':
      case 'initializing':
      case 'queued':
      default:
        return 'building';
    }
  }

  /**
   * Handle deployment completion
   */
  private onDeploymentComplete(deployment: DeploymentStatus): void {
    if (deployment.status === 'ready') {
      showSuccess(`🚀 Deployment ready! ${deployment.url}`);
      
      // Automatically open deployment URL
      if (deployment.url) {
        showInfo(`🌐 Live at: https://${deployment.url}`);
      }
    } else if (deployment.status === 'error') {
      showError(`❌ Deployment failed: ${deployment.error || 'Unknown error'}`);
    }

    // Clean up old deployments after completion
    setTimeout(() => {
      this.deployments.delete(deployment.id);
    }, 5 * 60 * 1000); // Keep for 5 minutes after completion
  }

  /**
   * Add a status listener
   */
  addStatusListener(deploymentId: string, callback: (status: DeploymentStatus) => void): void {
    this.statusListeners.set(deploymentId, callback);
  }

  /**
   * Remove a status listener
   */
  removeStatusListener(deploymentId: string): void {
    this.statusListeners.delete(deploymentId);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(deploymentId: string, status: DeploymentStatus): void {
    const listener = this.statusListeners.get(deploymentId);
    if (listener) {
      listener(status);
    }

    // Also emit to general deployment status listeners
    this.notifyGeneralListeners(status);
  }

  private generalListeners: Array<(status: DeploymentStatus) => void> = [];

  /**
   * Add a general deployment status listener
   */
  addGeneralStatusListener(callback: (status: DeploymentStatus) => void): void {
    this.generalListeners.push(callback);
  }

  /**
   * Remove a general deployment status listener
   */
  removeGeneralStatusListener(callback: (status: DeploymentStatus) => void): void {
    const index = this.generalListeners.indexOf(callback);
    if (index > -1) {
      this.generalListeners.splice(index, 1);
    }
  }

  /**
   * Notify general listeners
   */
  private notifyGeneralListeners(status: DeploymentStatus): void {
    this.generalListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Deployment status listener error:', error);
      }
    });
  }

  /**
   * Get current deployment status
   */
  getDeploymentStatus(deploymentId: string): DeploymentStatus | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Get all active deployments
   */
  getActiveDeployments(): DeploymentStatus[] {
    return Array.from(this.deployments.values()).filter(
      d => d.status === 'building'
    );
  }

  /**
   * Get recent deployments for an app
   */
  getRecentDeployments(appId: number): DeploymentStatus[] {
    return Array.from(this.deployments.values())
      .filter(d => d.appId === appId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5); // Last 5 deployments
  }

  /**
   * Cancel deployment tracking
   */
  cancelDeployment(deploymentId: string): void {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.status = 'canceled';
      deployment.updatedAt = Date.now();
      this.notifyListeners(deploymentId, deployment);
    }
  }

  /**
   * Clear old deployments
   */
  clearOldDeployments(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [id, deployment] of this.deployments.entries()) {
      if (deployment.updatedAt < oneHourAgo && 
          (deployment.status === 'ready' || deployment.status === 'error')) {
        this.deployments.delete(id);
        this.statusListeners.delete(id);
      }
    }
  }
}

export const deploymentStatusService = DeploymentStatusService.getInstance();