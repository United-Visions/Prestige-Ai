"use client";

import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
            Ready to Build Your Next Big Idea?
          </h2>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Don't wait. Start building for free and see your vision come to life.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm space-y-2">
            <Button type="submit" size="lg" className="w-full">Get Started</Button>
        </div>
      </div>
    </section>
  );
}