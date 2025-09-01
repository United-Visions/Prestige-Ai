"use client";

import { Todo } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

type TodoItemProps = {
  todo: Todo;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
};

const TodoItem = ({ todo, toggleTodo, deleteTodo }: TodoItemProps) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors">
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => toggleTodo(todo.id)}
      />
      <label
        htmlFor={`todo-${todo.id}`}
        className={cn(
          "flex-grow cursor-pointer text-sm font-medium",
          todo.completed ? "line-through text-muted-foreground" : ""
        )}
      >
        {todo.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteTodo(todo.id)}
        className="text-muted-foreground hover:text-destructive h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TodoItem;