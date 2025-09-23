# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

## Strict Environment Rules
- **Vite + React ONLY**: This is a Vite + React project. **DO NOT** use Next.js features, packages (like `next/navigation`), or file conventions.
- **Verify Imports**: Before importing a local component, page, or utility, you **MUST** ensure the file exists in the project. If it does not, you **MUST** create it first. Do not import non-existent files.
- **Component Usage**: Only use `shadcn/ui` components that are confirmed to exist in `src/components/ui` or custom components that you have explicitly created within the `src/components` directory. Do not invent or "hallucinate" components like `ValidatedForm`.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

## Database & Integrations

### MongoDB (Default Database)
- **MongoDB is the DEFAULT database** for all applications created with this scaffold.
- **Automatic Local Setup**: The agent can automatically provision a demo MongoDB instance locally using `mongodb-memory-server` (no connection string needed).
- **Pre-configured**: This scaffold comes with MongoDB connection utilities, schemas, and examples already set up.
- **Database Location**: 
  - Local development: Uses in-memory MongoDB via `mongodb-memory-server`
  - Connection utilities are in `src/lib/db.ts`
  - Schema definitions go in `src/lib/schemas.ts`
- **Usage**: Simply import and use the database utilities. The agent will automatically:
  1. Start the local MongoDB instance
  2. Create necessary schemas based on app requirements
  3. Set up CRUD operations as needed

### If Database is Required:
- **Default Action**: Use the pre-configured MongoDB setup (no user action required)
- **Schema Creation**: Create schemas in `src/lib/schemas.ts` using Mongoose
- **Connection**: Use the connection utilities in `src/lib/db.ts`
- **Auto-Provisioning**: If database connection fails, agent automatically creates local demo MongoDB

### Production Deployment:
- For production, the agent can later help configure managed MongoDB (Atlas) connections
- Environment variables will be added for production database URLs
- Local development always uses the in-memory MongoDB for simplicity

## AI Integration (Default)

### CRITICAL: AI SDK Configuration
- **FIXED CONFIGURATION**: This scaffold is SPECIFICALLY configured for Google Gemini AI
- **Pre-installed**: This scaffold comes with AI SDK (ai, @ai-sdk/google) for AI functionality
- **ONLY Model**: `gemini-2.5-flash` (Google's fast, free-tier model)
- **ONLY API Key**: When AI features are needed, prompt user ONLY for:
  1. Get Gemini API key from: https://aistudio.google.com/app/apikey
  2. Add to environment variables: `VITE_GEMINI_API_KEY=your_key_here`
- **DO NOT suggest any other AI providers** (OpenAI, Claude, etc.)
- **DO NOT ask for other API keys** (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
- **AI Utilities**: Pre-configured AI helpers in `src/lib/ai.ts` use Google Gemini only
- **Features Available**:
  - Text generation and completion
  - Streaming responses
  - Function calling
  - Embeddings and semantic search

### AI Usage Examples:
- Chat interfaces with streaming
- Content generation
- Smart form assistance
- Data analysis and insights
- Automated content creation

### Environment Setup for AI:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### External API Integrations
- **Flexible Integration**: While the scaffold uses Gemini for AI, it supports ANY external APIs for data and services
- **Examples**: Bible APIs, Weather APIs, News APIs, Maps APIs, etc.
- **Auto .env Management**: Use <prestige-setup-env> to automatically set up API keys in the .env file
- **User Choice**: Users can skip API setup during development and add keys later
- **Service Examples**:
  - Bible apps: Scripture API, Bible Gateway API
  - Weather apps: OpenWeatherMap, WeatherAPI
  - News apps: NewsAPI, Guardian API
  - Maps: Google Maps, MapBox
  - Any REST API or third-party service

### API Integration Pattern:
1. Install necessary packages (axios, fetch libraries)
2. Use <prestige-setup-env> to prompt for API keys
3. Create service files in `src/lib/` for API calls
4. Handle API responses and errors gracefully
5. Provide fallback data when APIs are unavailable

## Key Implementation Notes:

1. **Database First**: Always assume MongoDB is available and configured
2. **AI Ready**: Scaffold includes AI SDK setup - just need API key when AI features are used
3. **No Manual Setup**: Agent should not ask users to manually install MongoDB or AI SDK
4. **Auto-Configuration**: Agent should automatically create schemas and AI utilities as needed
5. **Environment Prompting**: Only prompt for API keys when AI features are actually implemented
