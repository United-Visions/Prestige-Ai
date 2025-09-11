# AI Agent Instructions for Supabase Project Interaction

## 1. Introduction & Core Mission

**Your primary directive is to write, modify, and maintain the code within this application's codebase.**

You are equipped with a specialized toolkit of scripts located in the `/supabase-agent/` directory. This toolkit is a **supporting mechanism** to help you interact with the Supabase environment (database, functions, etc.). Your main purpose is not to run scripts, but to **build and enhance the application itself.**

## 2. Operational Context: You Are a Code Editor First

*   **Your Brain is a Code Editor**: Your primary function is to read, understand, and write code in the project's source files (e.g., in `src/`, `supabase/functions/`, etc.).
*   **The Toolkit is Your Hands**: The scripts in `/supabase-agent/` are your "hands" to interact with the infrastructure. You write the code first, then you use the tools to deploy, migrate, or test it.
*   **The Goal is Working Software**: The final output is always a change in the application's source code that results in a new or improved feature, not just a successful script execution.

## 3. The Core Philosophy: The Development Loop

You must follow a strict, four-step development loop for every task:

1.  **OBSERVE**: Use the `1-context` scripts to gather information about the current state of the project.
    *   *What is the current database schema?* (`get-db-schema.sh`)
    *   *What are the existing RLS policies?* (Parse the output of `get-db-schema.sh`)
    *   *Are the local services running?* (`get-local-status.sh`)

2.  **PLAN & WRITE CODE**: Based on your observations and the user's request, formulate a plan and **write the necessary application code**.
    *   Create or modify the relevant files (e.g., `*.tsx` components, `supabase/functions/**/*.ts` API endpoints).
    *   Generate the specific SQL content for a migration if needed.

3.  **ACT**: Execute your plan using the `2-actions` scripts to deploy or apply the code you just wrote.
    *   Apply a database change: `apply-migration.sh`
    *   Deploy a function: `deploy-function.sh`
    *   Query data to inform your next step: `execute-query.sh`

4.  **VERIFY**: After acting, you must confirm that your action had the intended effect.
    *   *Did the schema change apply correctly?* Run `get-db-schema.sh` again and check the new schema.
    *   *Did the function deploy successfully?* Check the deployment logs and then call `get-function-logs.sh`.

## 4. Strict Rules of Engagement

**Failure to follow these rules will result in mission failure.**

*   **RULE 1: WRITE CODE FIRST.** Your primary action is always to create or modify the application's source files.
*   **RULE 2: USE THE TOOLKIT.** You MUST use the scripts provided in `/supabase-agent/` to interact with the Supabase environment.
*   **RULE 3: DO NOT USE `supabase` DIRECTLY.** You are forbidden from running `npx supabase ...` commands directly.
*   **RULE 4: WORK IN ISOLATION.** For any new feature, you MUST first create a new feature branch using `create-feature-branch.sh`.
*   **RULE 5: MAINTAIN CODE QUALITY.** Before considering a task complete, you MUST run `lint-code.sh`.
*   **RULE 6: TEST YOUR WORK.** Whenever possible, use `run-db-tests.sh` and `run-app-tests.sh` to validate your changes.

## 5. Toolkit Reference
(This section remains the same as before, listing all available scripts)
...

## 6. Example Workflows

### Workflow: Creating a "hello-world" Edge Function

1.  **PLAN**:
    *   Plan: Create a new Edge Function named `hello-world` that returns a simple greeting.
    *   Determine file path: `supabase/functions/hello-world/index.ts`.

2.  **WRITE CODE**: Create the file `supabase/functions/hello-world/index.ts` with the following content:
    ```typescript
    import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

    serve(async (req) => {
      return new Response(
        JSON.stringify({ message: "Hello World!" }),
        { headers: { "Content-Type": "application/json" } },
      )
    })
    ```

3.  **ACT**: Now that the code is written, deploy it. Run `sh supabase-agent/2-actions/deploy-function.sh "hello-world"`.

4.  **VERIFY**: After deployment, run `sh supabase-agent/1-context/get-function-logs.sh "hello-world"`. Check for any deployment errors. If none, the task is complete.

You are now fully briefed. Your primary role is a software developer. Your tools support that role. Execute your mission with precision.
