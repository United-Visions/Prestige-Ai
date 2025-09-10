import { z } from 'zod';
import { supabaseService } from './supabaseService';
import { vercelService } from './vercelService';
import { githubService } from './githubService';

// Flow control schemas
export const IntegrationRequirement = z.enum([
  'database',
  'authentication', 
  'deployment',
  'version_control',
  'api_keys',
  'backend_api',
  'real_time',
  'file_storage',
  'email_service',
]);
export type IntegrationType = z.infer<typeof IntegrationRequirement>;

export const FlowControlAction = z.enum([
  'pause_and_request',
  'provide_instructions',
  'continue_with_mock',
  'skip_requirement',
  'auto_configure',
]);
export type FlowAction = z.infer<typeof FlowControlAction>;

export const AgentBlockReason = z.enum([
  'missing_database',
  'missing_auth_provider',
  'missing_deployment_target',
  'missing_repository',
  'missing_api_credentials',
  'missing_backend_endpoint',
  'missing_real_time_config',
  'missing_storage_config',
  'missing_email_config',
]);
export type BlockReason = z.infer<typeof AgentBlockReason>;

export interface IntegrationCheck {
  type: IntegrationType;
  required: boolean;
  configured: boolean;
  service?: 'supabase' | 'vercel' | 'github' | 'custom';
  blockReason?: BlockReason;
  message?: string;
  actionRequired?: string;
}

export interface FlowControlResult {
  shouldProceed: boolean;
  action: FlowAction;
  blockReason?: BlockReason;
  message: string;
  instructions?: string[];
  missingIntegrations: IntegrationCheck[];
  availableAlternatives?: string[];
}

export interface AgentRequest {
  id: string;
  content: string;
  appId?: number;
  shouldBlock: boolean;
  detectedIntentions: {
    requiresDatabase: boolean;
    requiresAuthentication: boolean;
    requiresDeployment: boolean;
    requiresVersionControl: boolean;
    requiresBackendApi: boolean;
    requiresRealTime: boolean;
    requiresFileStorage: boolean;
    requiresEmailService: boolean;
  };
  timestamp: number;
}

// Pattern detection for identifying integration needs
const INTEGRATION_PATTERNS = {
  database: [
    /\b(database|db|sql|nosql|mongodb|postgresql|mysql|sqlite)\b/i,
    /\b(create table|insert|select|update|delete|query|schema)\b/i,
    /\b(prisma|drizzle|mongoose|sequelize|typeorm)\b/i,
    /\b(store data|save to database|persist|CRUD)\b/i,
  ],
  authentication: [
    /\b(auth|login|signup|register|session|jwt|oauth|password)\b/i,
    /\b(user management|access control|permissions|roles)\b/i,
    /\b(sign in|sign up|log out|authenticate|authorize)\b/i,
  ],
  deployment: [
    /\b(deploy|deployment|hosting|production|live|publish)\b/i,
    /\b(vercel|netlify|aws|azure|heroku|docker)\b/i,
    /\b(build and deploy|go live|production ready)\b/i,
  ],
  version_control: [
    /\b(git|github|gitlab|bitbucket|repository|repo|commit|push)\b/i,
    /\b(version control|source control|collaboration)\b/i,
  ],
  backend_api: [
    /\b(api|endpoint|rest|graphql|server|backend)\b/i,
    /\b(fetch|axios|http request|api call|microservices)\b/i,
    /\b(server|backend|api routes|middleware)\b/i,
  ],
  real_time: [
    /\b(real.?time|websocket|socket\.io|live updates|notifications)\b/i,
    /\b(chat|messaging|collaboration|sync|broadcast)\b/i,
    /\b(realtime|real time|live data|push notifications)\b/i,
  ],
  file_storage: [
    /\b(file upload|image upload|file storage|s3|cloudinary)\b/i,
    /\b(media|assets|documents|files|attachments)\b/i,
  ],
  email_service: [
    /\b(email|mail|smtp|sendgrid|mailgun|notifications)\b/i,
    /\b(send email|email templates|newsletter|contact form)\b/i,
  ],
};

export class AgentFlowControlService {
  private static instance: AgentFlowControlService;

  static getInstance(): AgentFlowControlService {
    if (!AgentFlowControlService.instance) {
      AgentFlowControlService.instance = new AgentFlowControlService();
    }
    return AgentFlowControlService.instance;
  }

  /**
   * Analyze user request to detect integration requirements
   */
  analyzeRequest(content: string, appId?: number): AgentRequest {
    const detectedIntentions = {
      requiresDatabase: this.detectPattern(content, INTEGRATION_PATTERNS.database),
      requiresAuthentication: this.detectPattern(content, INTEGRATION_PATTERNS.authentication),
      requiresDeployment: this.detectPattern(content, INTEGRATION_PATTERNS.deployment),
      requiresVersionControl: this.detectPattern(content, INTEGRATION_PATTERNS.version_control),
      requiresBackendApi: this.detectPattern(content, INTEGRATION_PATTERNS.backend_api),
      requiresRealTime: this.detectPattern(content, INTEGRATION_PATTERNS.real_time),
      requiresFileStorage: this.detectPattern(content, INTEGRATION_PATTERNS.file_storage),
      requiresEmailService: this.detectPattern(content, INTEGRATION_PATTERNS.email_service),
    };

    // Determine if we should block based on detected intentions and missing integrations
    const shouldBlock = Object.values(detectedIntentions).some(Boolean);

    return {
      id: this.generateId(),
      content,
      appId,
      shouldBlock,
      detectedIntentions,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if agent should proceed or be blocked based on integration requirements
   */
  async checkFlowControl(request: AgentRequest): Promise<FlowControlResult> {
    const integrationChecks = await this.performIntegrationChecks(request);
    const missingRequired = integrationChecks.filter(check => check.required && !check.configured);
    
    if (missingRequired.length === 0) {
      return {
        shouldProceed: true,
        action: 'continue_with_mock',
        message: 'All required integrations are configured. Proceeding with request.',
        missingIntegrations: [],
      };
    }

    // Determine the most critical missing integration
    const criticalMissing = this.prioritizeMissingIntegrations(missingRequired);
    const primaryMissing = criticalMissing[0];

    const flowResult: FlowControlResult = {
      shouldProceed: false,
      action: 'pause_and_request',
      blockReason: primaryMissing.blockReason,
      message: this.generateBlockMessage(primaryMissing),
      instructions: this.generateSetupInstructions(primaryMissing),
      missingIntegrations: criticalMissing,
      availableAlternatives: this.generateAlternatives(primaryMissing),
    };

    return flowResult;
  }

  /**
   * Generate a user-friendly block message
   */
  private generateBlockMessage(integration: IntegrationCheck): string {
    const baseMessages = {
      missing_database: "I need a database to store and manage your data effectively.",
      missing_auth_provider: "I need authentication setup to handle user management securely.",
      missing_deployment_target: "I need deployment configuration to make your app accessible online.",
      missing_repository: "I need Git repository access to manage your code properly.",
      missing_api_credentials: "I need API credentials to connect with external services.",
      missing_backend_endpoint: "I need backend API endpoints to handle server-side logic.",
      missing_real_time_config: "I need real-time configuration for live updates and messaging.",
      missing_storage_config: "I need file storage configuration for handling uploads and media.",
      missing_email_config: "I need email service configuration for sending notifications and messages.",
    };

    const baseMessage = integration.blockReason 
      ? baseMessages[integration.blockReason] 
      : `I need ${integration.type} configuration to proceed.`;

    const actionMessage = integration.actionRequired || "Please set up the required integration to continue.";
    
    return `${baseMessage} ${actionMessage}`;
  }

  /**
   * Generate step-by-step setup instructions
   */
  private generateSetupInstructions(integration: IntegrationCheck): string[] {
    const instructionMap = {
      missing_database: [
        "Go to Settings → Integrations",
        "Click 'Connect Supabase' to set up a database",
        "Create a new project or connect an existing one",
        "Once connected, I can create tables and manage your data"
      ],
      missing_auth_provider: [
        "First, set up a database (Supabase recommended)",
        "Go to Settings → Integrations → Supabase",
        "Enable Authentication in your Supabase project",
        "Configure auth providers (email/password, OAuth, etc.)",
        "I'll then integrate auth into your app"
      ],
      missing_deployment_target: [
        "Go to Settings → Integrations",
        "Connect your Vercel account for easy deployment",
        "Or set up GitHub integration for automated deployments",
        "Once configured, I can deploy your app automatically"
      ],
      missing_repository: [
        "Go to Settings → Integrations",
        "Connect your GitHub account",
        "Create a new repository or connect an existing one",
        "This allows me to manage your code and enable collaboration"
      ],
    };

    return integration.blockReason 
      ? instructionMap[integration.blockReason] || ["Please configure the required integration in Settings."]
      : ["Please configure the required integration in Settings."];
  }

  /**
   * Generate alternative solutions
   */
  private generateAlternatives(integration: IntegrationCheck): string[] {
    const alternativeMap = {
      missing_database: [
        "I can create a local JSON file for simple data storage",
        "Use localStorage for client-side data persistence",
        "Create mock data structures for development"
      ],
      missing_auth_provider: [
        "Create a simple mock authentication system",
        "Use localStorage to simulate user sessions",
        "Build a basic login form without backend integration"
      ],
      missing_deployment_target: [
        "Continue with local development setup",
        "Create build scripts for manual deployment",
        "Set up the app structure ready for future deployment"
      ],
    };

    return integration.blockReason 
      ? alternativeMap[integration.blockReason] || []
      : [];
  }

  /**
   * Perform comprehensive integration checks
   */
  private async performIntegrationChecks(request: AgentRequest): Promise<IntegrationCheck[]> {
    const checks: IntegrationCheck[] = [];

    // Database check
    if (request.detectedIntentions.requiresDatabase) {
      const isSupabaseConnected = supabaseService.isAuthenticated();
      checks.push({
        type: 'database',
        required: true,
        configured: isSupabaseConnected,
        service: 'supabase',
        blockReason: isSupabaseConnected ? undefined : 'missing_database',
        message: isSupabaseConnected 
          ? 'Database is configured and ready' 
          : 'Database connection required for data operations',
        actionRequired: isSupabaseConnected ? undefined : 'Please connect to Supabase in Settings → Integrations',
      });
    }

    // Authentication check
    if (request.detectedIntentions.requiresAuthentication) {
      const hasAuthProvider = supabaseService.isAuthenticated(); // Supabase provides auth
      checks.push({
        type: 'authentication',
        required: true,
        configured: hasAuthProvider,
        service: 'supabase',
        blockReason: hasAuthProvider ? undefined : 'missing_auth_provider',
        message: hasAuthProvider 
          ? 'Authentication provider is configured' 
          : 'Authentication setup required for user management',
        actionRequired: hasAuthProvider ? undefined : 'Please set up Supabase authentication',
      });
    }

    // Deployment check
    if (request.detectedIntentions.requiresDeployment) {
      const isVercelConnected = vercelService.isAuthenticated();
      const isGitHubConnected = githubService.isAuthenticated();
      const hasDeploymentOption = isVercelConnected || isGitHubConnected;
      
      checks.push({
        type: 'deployment',
        required: true,
        configured: hasDeploymentOption,
        service: isVercelConnected ? 'vercel' : isGitHubConnected ? 'github' : undefined,
        blockReason: hasDeploymentOption ? undefined : 'missing_deployment_target',
        message: hasDeploymentOption 
          ? 'Deployment target is configured' 
          : 'Deployment configuration required',
        actionRequired: hasDeploymentOption ? undefined : 'Please connect Vercel or GitHub for deployment',
      });
    }

    // Version control check
    if (request.detectedIntentions.requiresVersionControl) {
      const isGitHubConnected = githubService.isAuthenticated();
      checks.push({
        type: 'version_control',
        required: true,
        configured: isGitHubConnected,
        service: 'github',
        blockReason: isGitHubConnected ? undefined : 'missing_repository',
        message: isGitHubConnected 
          ? 'Version control is configured' 
          : 'Git repository access required',
        actionRequired: isGitHubConnected ? undefined : 'Please connect GitHub for version control',
      });
    }

    // Backend API check
    if (request.detectedIntentions.requiresBackendApi) {
      // For now, we assume Supabase provides backend API capabilities
      const hasBackendApi = supabaseService.isAuthenticated();
      checks.push({
        type: 'backend_api',
        required: false, // Often optional, can use frontend-only solutions
        configured: hasBackendApi,
        service: 'supabase',
        blockReason: hasBackendApi ? undefined : 'missing_backend_endpoint',
        message: hasBackendApi 
          ? 'Backend API capabilities available through Supabase' 
          : 'Backend API recommended for server-side operations',
      });
    }

    return checks;
  }

  /**
   * Prioritize missing integrations by criticality
   */
  private prioritizeMissingIntegrations(missing: IntegrationCheck[]): IntegrationCheck[] {
    const priority = ['database', 'authentication', 'version_control', 'deployment', 'backend_api'];
    
    return missing.sort((a, b) => {
      const aIndex = priority.indexOf(a.type);
      const bIndex = priority.indexOf(b.type);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }

  /**
   * Detect if content matches integration patterns
   */
  private detectPattern(content: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a user-friendly response when agent is blocked
   */
  createBlockedResponse(flowResult: FlowControlResult): string {
    let response = `🛑 **Hold on!** ${flowResult.message}\n\n`;

    if (flowResult.instructions && flowResult.instructions.length > 0) {
      response += "**Here's how to set this up:**\n";
      flowResult.instructions.forEach((instruction, index) => {
        response += `${index + 1}. ${instruction}\n`;
      });
      response += "\n";
    }

    if (flowResult.availableAlternatives && flowResult.availableAlternatives.length > 0) {
      response += "**Or, I can help you with these alternatives:**\n";
      flowResult.availableAlternatives.forEach((alternative, index) => {
        response += `• ${alternative}\n`;
      });
      response += "\n";
    }

    response += "Once you've set up the integration, just let me know and I'll continue with your request! 🚀";

    return response;
  }

  /**
   * Check if specific integration type is available
   */
  async isIntegrationAvailable(type: IntegrationType): Promise<boolean> {
    switch (type) {
      case 'database':
        return supabaseService.isAuthenticated();
      case 'authentication':
        return supabaseService.isAuthenticated();
      case 'deployment':
        return vercelService.isAuthenticated() || githubService.isAuthenticated();
      case 'version_control':
        return githubService.isAuthenticated();
      case 'backend_api':
        return supabaseService.isAuthenticated();
      default:
        return false;
    }
  }
}

export const agentFlowControlService = AgentFlowControlService.getInstance();