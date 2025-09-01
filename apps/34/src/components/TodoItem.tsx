"use client";

import { Todo } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
}

export function TodoItem({ todo, toggleTodo, deleteTodo }: TodoItemProps) {
  return (
    <div className="flex items-center gap-4 p-2 border-b">
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => toggleTodo(todo.id)}
        aria-label={`Mark ${todo.text} as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`todo-${todo.id}`}
        className={cn(
          "flex-1 text-lg",
          todo.completed && "line-through text-muted-foreground"
        )}
      >
        {todo.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteTodo(todo.id)}
        aria-label={`Delete ${todo.text}`}
      >
        <Trash2 className="h-5 w-5 text-red-500" />
      </Button>
    </div>
  );
}