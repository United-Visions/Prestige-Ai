# Prestige AI Scaffold

A modern React application scaffold with pre-configured **MongoDB** database and **AI SDK** integration using **Gemini 2.5 Flash**.

## 🚀 Features

- **⚡ React 18** with TypeScript and Vite
- **🎨 shadcn/ui** - Complete UI component library
- **🧠 AI Integration** - Gemini 2.5 Flash with AI SDK
- **🗄️ MongoDB Ready** - Auto-configured with schemas and utilities
- **📱 Responsive Design** - Tailwind CSS with dark mode support
- **🔧 Developer Ready** - ESLint, TypeScript, and modern tooling

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Set Up Environment (Optional for AI features)
```bash
cp .env.example .env
```

Add your Gemini API key to `.env`:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Get your API key**: https://aistudio.google.com/app/apikey

### 3. Start Development
```bash
npm run dev
# or
pnpm dev
```

Visit http://localhost:32100 to see your app!

## 📁 Project Structure

```
src/
├── components/          # UI components
│   ├── ui/             # shadcn/ui components
│   ├── ai-chat.tsx     # AI chat component
│   ├── ai-text-generator.tsx  # AI text generation
│   └── database-demo.tsx      # MongoDB demo
├── lib/
│   ├── ai.ts           # AI utilities and configuration
│   ├── db.ts           # MongoDB connection utilities
│   ├── schemas.ts      # MongoDB schemas and models
│   └── utils.ts        # General utilities
├── pages/
│   ├── Index.tsx       # Main page with demos
│   └── NotFound.tsx    # 404 page
└── hooks/              # Custom React hooks
```

## 🧠 AI Features

### Pre-configured Components

- **AI Text Generator**: Generate content using prompts
- **AI Chat**: Interactive chat with streaming responses
- **Content Enhancement**: Improve and optimize text
- **SEO Generation**: Auto-generate meta tags and descriptions

### Available AI Utilities

```typescript
import { 
  generateAIText, 
  streamAIText, 
  chatWithAI, 
  generateAIObject 
} from '@/lib/ai';

// Simple text generation
const result = await generateAIText("Write a blog post about AI");

// Streaming responses
await streamAIText("Explain React hooks", (chunk) => {
  console.log(chunk);
});

// Structured data with Zod schemas
const data = await generateAIObject(prompt, schema);
```

## 🗄️ Database (MongoDB)

### Automatic Setup

- **In-Memory MongoDB**: Automatically starts for development
- **Pre-built Schemas**: User, Post, Product, and Task models ready to use
- **Connection Utilities**: Simple database connection management

### Available Models

```typescript
import { User, Post, Product, Task } from '@/lib/schemas';

// Create a user
const user = await createUser({
  name: "John Doe",
  email: "john@example.com"
});

// Get published posts
const posts = await getPublishedPosts(10);
```

### Production Setup

For production, set your MongoDB connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## 🎨 UI Components

This scaffold includes all shadcn/ui components:

- **Forms**: Input, Textarea, Select, Checkbox, etc.
- **Navigation**: Tabs, Breadcrumb, Navigation Menu
- **Feedback**: Toast, Alert, Progress, Loading states
- **Layout**: Card, Separator, Sheet, Dialog
- **Data Display**: Table, Badge, Avatar, Calendar

### Example Usage

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Feature</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click Me</Button>
      </CardContent>
    </Card>
  );
}
```

## 🔧 Available Scripts

- `npm run dev` - Start development server (port 32100)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌍 Environment Variables

### Required for AI Features
- `VITE_GEMINI_API_KEY` - Your Gemini API key

### Optional for Database
- `MONGODB_URI` - Production MongoDB connection string
- `DATABASE_URL` - Alternative database URL format

## 📚 Learn More

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Gemini API Guide](https://ai.google.dev/docs)

## 🤝 Built with Prestige AI

This scaffold was created using **Prestige AI** - an intelligent coding assistant that helps you build modern applications faster.

---

**Happy coding!** 🚀
