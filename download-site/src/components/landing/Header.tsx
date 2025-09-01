"use client";

import { Rocket, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center bg-background sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg">
      <a className="flex items-center justify-center" href="#">
        <Rocket className="h-6 w-6" />
        <span className="ml-2 font-semibold">Prestige AI</span>
      </a>
      <nav className="ml-auto hidden lg:flex gap-4 sm:gap-6">
        <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
          Features
        </a>
        <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
          Pricing
        </a>
        <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
          About
        </a>
        <Button>Get Started</Button>
      </nav>
      <div className="ml-auto lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="grid gap-4 p-4">
              <a className="font-medium" href="#">
                Features
              </a>
              <a className="font-medium" href="#">
                Pricing
              </a>
              <a className="font-medium" href="#">
                About
              </a>
              <div className="pt-4">
                <Button className="w-full">Get Started</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}