# AI Rules and Guidelines

## Core Principles

1. **User-Centric Design**: Always prioritize user experience and usability
2. **Code Quality**: Write clean, maintainable, and well-documented code
3. **Best Practices**: Follow industry standards and conventions
4. **Performance**: Optimize for speed and efficiency
5. **Accessibility**: Ensure applications are accessible to all users

## Development Guidelines

### React/TypeScript Projects
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow component composition patterns
- Use proper state management (Context API, Zustand, etc.)

### Code Structure
- Organize components logically
- Separate business logic from UI components
- Use proper file naming conventions
- Implement error boundaries

### Styling
- Use modern CSS approaches (CSS Modules, Styled Components, Tailwind)
- Implement responsive design
- Follow design system principles

### Performance
- Implement code splitting where appropriate
- Optimize bundle sizes
- Use proper caching strategies
- Minimize re-renders

## Template Creation Rules

1. **Complete Functionality**: Templates should provide working, complete applications
2. **Modern Stack**: Use current versions of frameworks and libraries
3. **Documentation**: Include clear README files and inline comments
4. **Scalability**: Structure code to allow for easy extension
5. **Best Practices**: Demonstrate proper patterns and conventions

## File Creation Standards

- Include proper package.json with all dependencies
- Add configuration files (tsconfig, eslint, etc.)
- Create proper folder structure
- Include environment configuration templates
- Add build and development scripts

## Database & Integrations

- Default Demo DB: MongoDB is the default for demo/local development. The agent can automatically create and connect to a local demo MongoDB instance without asking the user for a connection string.
- No Connection String Prompts: If a user request requires a database and none is configured, the agent should auto-provision a demo MongoDB and continue. Only show a setup prompt if automatic provisioning fails.
- Persistence: When the project is set to use MongoDB, the agent saves minimal per-project settings (e.g., provider: mongodb, mode: demo) so subsequent operations don’t require reconfiguration.
- Production Later: Production database setup (e.g., managed MongoDB and deployment variables) can be added when deploying (e.g., to Vercel), but is not required for local/demo workflows.