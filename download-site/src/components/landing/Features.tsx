"use client";

import { Zap, Code, Rocket } from "lucide-react";

export default function Features() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted-foreground/10 px-3 py-1 text-sm">Key Features</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Faster Than Ever Before</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Our platform is designed to help you build and deploy applications with unprecedented speed and efficiency.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
          <div className="grid gap-1 text-center">
            <div className="flex justify-center items-center mb-4">
                <Zap className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Instant Generation</h3>
            <p className="text-muted-foreground">
              From a simple prompt to a fully functional codebase in seconds.
            </p>
          </div>
          <div className="grid gap-1 text-center">
            <div className="flex justify-center items-center mb-4">
                <Code className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Clean Code</h3>
            <p className="text-muted-foreground">
              We generate clean, maintainable code that follows best practices.
            </p>
          </div>
          <div className="grid gap-1 text-center">
            <div className="flex justify-center items-center mb-4">
                <Rocket className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Rapid Deployment</h3>
            <p className="text-muted-foreground">
              Deploy your application with a single click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}