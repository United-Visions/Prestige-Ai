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

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

## Database & Integrations

- MongoDB is the default database for demo/local development. The agent can automatically provision a demo MongoDB instance locally (no connection string needed) and use it for database-related tasks.
- If a database is required and none is configured, the agent should automatically create a local demo MongoDB and proceed. Only prompt the user if automatic provisioning fails.
- When a project later needs production deployment, production database setup (e.g., managed MongoDB and environment configuration) can be added, but this is not required for demo/local flows.
