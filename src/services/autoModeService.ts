import { aiModelServiceV2 as aiModelService } from '@/services/aiModelService';
import type { DevelopmentPlan, PlanPhase, TodoItem, UnfinishedPlanBrief } from '@/types/autoMode';
import { AdvancedAppManagementService } from './advancedAppManagementService';

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class AutoModeService {
  private static instance: AutoModeService;
  private plansByConversation: Map<number, DevelopmentPlan[]> = new Map();

  static getInstance(): AutoModeService {
    if (!this.instance) this.instance = new AutoModeService();
    return this.instance;
  }

  async getPlans(conversationId: number): Promise<DevelopmentPlan[]> {
    // Try cache first
    if (this.plansByConversation.has(conversationId)) {
      return this.plansByConversation.get(conversationId) || [];
    }
    // Load from DB
    try {
      const dbPlans = await window.electronAPI.db.getPlansForConversation(conversationId);
      const plans = dbPlans.map(p => ({ ...p, phases: p.phases || [] }));
      this.plansByConversation.set(conversationId, plans);
      return plans;
    } catch (e) {
      console.warn('Failed to load plans from DB:', e);
      return [];
    }
  }

  async getPlan(conversationId: number, planId: string): Promise<DevelopmentPlan | undefined> {
    const plans = await this.getPlans(conversationId);
    return plans.find(p => p.id === planId);
  }

  async getUnfinishedPlansForApp(appId: number): Promise<UnfinishedPlanBrief[]> {
    try {
      const dbPlans = await window.electronAPI.db.getUnfinishedPlansForApp(appId);
      const briefs: UnfinishedPlanBrief[] = [];
      for (const plan of dbPlans) {
        const phases = plan.phases || [];
        const remaining = phases.flatMap((p: any) => p.todos || []).filter((t: any) => t.status !== 'completed').length;
        if (remaining > 0) {
          briefs.push({
            planId: plan.id,
            conversationId: plan.conversationId,
            title: plan.title,
            remainingCount: remaining,
            updatedAt: plan.updatedAt,
          });
        }
      }
      briefs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return briefs;
    } catch (e) {
      console.warn('Failed to load unfinished plans:', e);
      return [];
    }
  }

  async attachPlan(conversationId: number, plan: DevelopmentPlan) {
    const current = this.plansByConversation.get(conversationId) || [];
    const updated = [plan, ...current];
    this.plansByConversation.set(conversationId, updated);
    // Persist to DB
    try {
      await window.electronAPI.db.upsertPlan(plan);
    } catch (e) {
      console.warn('Failed to persist plan:', e);
    }
  }

  async updatePlan(conversationId: number, plan: DevelopmentPlan) {
    const current = this.plansByConversation.get(conversationId) || [];
    const next = current.map(p => (p.id === plan.id ? plan : p));
    this.plansByConversation.set(conversationId, next);
    // Persist to DB
    try {
      await window.electronAPI.db.upsertPlan(plan);
    } catch (e) {
      console.warn('Failed to update plan:', e);
    }
  }

  async getNextPendingTodo(conversationId: number, planId: string): Promise<{ phase: string; todo: TodoItem } | null> {
    const plan = await this.getPlan(conversationId, planId);
    if (!plan) return null;
    for (const phase of plan.phases) {
      const todo = phase.todos.find(t => t.status !== 'completed');
      if (todo) return { phase: phase.title, todo };
    }
    return null;
  }

  async clonePlanToConversation(sourcePlan: DevelopmentPlan, targetConversationId: number): Promise<DevelopmentPlan> {
    const now = new Date().toISOString();
    const cloned: DevelopmentPlan = {
      ...sourcePlan,
      id: genId(),
      conversationId: targetConversationId,
      createdAt: now,
      updatedAt: now,
      phases: sourcePlan.phases.map(p => ({
        id: genId(),
        title: p.title,
        description: p.description,
        todos: p.todos.map(t => ({
          ...t,
          id: genId(),
          status: t.status === 'completed' ? 'pending' : t.status,
          completedAt: undefined,
          createdAt: now
        }))
      }))
    };
    await this.attachPlan(targetConversationId, cloned);
    return cloned;
  }

  async markTodo(conversationId: number, planId: string, todoId: string, status: TodoItem['status']) {
    const plans = await this.getPlans(conversationId);
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    for (const phase of plan.phases) {
      const todo = phase.todos.find(t => t.id === todoId);
      if (todo) {
        todo.status = status;
        if (status === 'completed') todo.completedAt = new Date().toISOString();
        plan.updatedAt = new Date().toISOString();
        await this.updatePlan(conversationId, plan);
        break;
      }
    }
  }

  async generatePlanForConversation(
    appId: number,
    conversationId: number,
    selectedModel: any,
    systemPrompt: string,
    conversationMessages: any[],
    userGoal?: string
  ): Promise<DevelopmentPlan> {
    // Create a comprehensive prompt for AI to generate a realistic development plan
    const planPrompt = `Based on the user's request and conversation context, create a detailed development plan.

User Goal: ${userGoal || 'Create and enhance the application'}

Context from conversation:
${conversationMessages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Please analyze the user's specific requirements and create a comprehensive development plan with realistic phases and actionable todos. Consider:
1. The user's explicit goals and features mentioned
2. Best practices for modern web development
3. Integration requirements (GitHub, Supabase, Vercel if mentioned)
4. Testing and deployment considerations
5. Progressive development approach

Return ONLY a JSON object with this exact structure:
{
  "title": "Descriptive plan title based on user goals",
  "summary": "Brief overview of what will be built",
  "phases": [
    {
      "title": "Phase name",
      "description": "What this phase accomplishes", 
      "todos": [
        {
          "title": "Specific actionable task",
          "description": "Detailed description of what needs to be done"
        }
      ]
    }
  ]
}

Make the plan specific to what the user actually wants to build, not generic. Include 3-5 phases with 2-4 specific todos each.`;

    let parsed: any;
    
    try {
      const raw = await aiModelService.generateResponse(selectedModel, systemPrompt, [
        ...conversationMessages,
        { id: Date.now(), role: 'user', content: planPrompt, createdAt: new Date(), conversationId }
      ]);

      try {
        // Try to extract JSON from the response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, try parsing the entire response
          parsed = JSON.parse(raw);
        }
        
        // Validate the structure
        if (!parsed.title || !parsed.phases || !Array.isArray(parsed.phases)) {
          throw new Error('Invalid plan structure');
        }
      } catch (e) {
        console.warn('Failed to parse AI plan response, using fallback:', e);
        // Create a more intelligent fallback based on user goal
        const goalLower = (userGoal || '').toLowerCase();
        let phases = [];
        
        if (goalLower.includes('todo') || goalLower.includes('task')) {
          phases = [
            { title: 'Setup & Foundation', description: 'Initialize todo app structure', todos: [
              { title: 'Create task data model', description: 'Design task schema with priorities, due dates, categories' },
              { title: 'Setup task storage', description: 'Implement local storage or database for tasks' }
            ]},
            { title: 'Core Features', description: 'Implement main todo functionality', todos: [
              { title: 'Add task creation form', description: 'Build form to create new tasks with validation' },
              { title: 'Task list display', description: 'Show tasks with filtering and sorting options' },
              { title: 'Task completion toggle', description: 'Mark tasks as complete/incomplete' }
            ]},
            { title: 'Enhanced UX', description: 'Improve user experience', todos: [
              { title: 'Add drag & drop reordering', description: 'Allow users to reorder tasks by dragging' },
              { title: 'Implement task categories', description: 'Add color-coded categories for organization' }
            ]}
          ];
        } else if (goalLower.includes('blog') || goalLower.includes('cms')) {
          phases = [
            { title: 'Content Management', description: 'Setup blog infrastructure', todos: [
              { title: 'Create post data model', description: 'Design blog post schema with metadata' },
              { title: 'Build post editor', description: 'Rich text editor for creating blog posts' }
            ]},
            { title: 'Frontend Display', description: 'Public blog interface', todos: [
              { title: 'Post listing page', description: 'Display blog posts with pagination' },
              { title: 'Individual post view', description: 'Single post page with comments' }
            ]},
            { title: 'Admin Features', description: 'Blog management tools', todos: [
              { title: 'Admin dashboard', description: 'Interface for managing posts and settings' },
              { title: 'SEO optimization', description: 'Meta tags and search engine optimization' }
            ]}
          ];
        } else if (goalLower.includes('ecommerce') || goalLower.includes('shop')) {
          phases = [
            { title: 'Product Catalog', description: 'Setup product management', todos: [
              { title: 'Product data model', description: 'Schema for products, categories, inventory' },
              { title: 'Product listing page', description: 'Display products with search and filters' }
            ]},
            { title: 'Shopping Cart', description: 'Shopping and checkout flow', todos: [
              { title: 'Add to cart functionality', description: 'Cart state management and persistence' },
              { title: 'Checkout process', description: 'Multi-step checkout with payment integration' }
            ]},
            { title: 'Order Management', description: 'Order processing and tracking', todos: [
              { title: 'Order confirmation system', description: 'Email confirmations and order tracking' },
              { title: 'Admin order dashboard', description: 'Manage orders and inventory' }
            ]}
          ];
        } else {
          // Generic development plan
          phases = [
            { title: 'Foundation', description: 'Setup project architecture', todos: [
              { title: 'Initialize project structure', description: 'Setup React app with routing and state management' },
              { title: 'Configure development tools', description: 'Setup linting, formatting, and build tools' }
            ]},
            { title: 'Core Features', description: 'Implement main functionality', todos: [
              { title: 'Build main components', description: 'Create primary UI components and layouts' },
              { title: 'Implement data flow', description: 'Setup API calls and state management' }
            ]},
            { title: 'Enhancement & Polish', description: 'Improve user experience', todos: [
              { title: 'Add responsive design', description: 'Ensure mobile-friendly layouts' },
              { title: 'Performance optimization', description: 'Code splitting and loading optimization' }
            ]}
          ];
        }
        
        parsed = {
          title: `${userGoal || 'Development Plan'}`,
          summary: `Comprehensive plan for building ${userGoal || 'the application'}`,
          phases
        };
      }
    } catch (error) {
      console.error('AI plan generation failed completely:', error);
      // Final fallback
      parsed = {
        title: 'Development Plan',
        summary: 'Basic development plan for the application',
        phases: [
          { title: 'Setup', description: 'Initialize the project', todos: [
            { title: 'Project scaffolding', description: 'Setup basic project structure and dependencies' }
          ]},
          { title: 'Development', description: 'Build core features', todos: [
            { title: 'Implement main features', description: 'Build the primary functionality of the application' }
          ]},
          { title: 'Finalization', description: 'Complete and deploy', todos: [
            { title: 'Testing and deployment', description: 'Test the application and prepare for deployment' }
          ]}
        ]
      };
    }

    const now = new Date().toISOString();
    const phases: PlanPhase[] = (parsed.phases || []).map((p: any) => ({
      id: genId(),
      title: p.title || 'Phase',
      description: p.description,
      todos: (p.todos || []).map((t: any) => ({
        id: genId(),
        title: t.title || 'Task',
        description: t.description,
        status: 'pending',
        createdAt: now
      }))
    }));

    const plan: DevelopmentPlan = {
      id: genId(),
      appId,
      conversationId,
      createdAt: now,
      updatedAt: now,
      title: parsed.title || 'Development Plan',
      summary: parsed.summary,
      phases
    };

    await this.attachPlan(conversationId, plan);
    return plan;
  }
}

export const autoModeService = AutoModeService.getInstance();