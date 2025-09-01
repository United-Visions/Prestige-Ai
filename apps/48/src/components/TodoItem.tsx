import { Todo } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

type TodoItemProps = {
  todo: Todo;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
};

export default function TodoItem({ todo, toggleTodo, deleteTodo }: TodoItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-md transition-colors hover:bg-muted/50">
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => toggleTodo(todo.id)}
        aria-label={`Mark ${todo.text} as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`todo-${todo.id}`}
        className={`flex-1 cursor-pointer text-sm font-medium ${
          todo.completed ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteTodo(todo.id)}
        aria-label={`Delete ${todo.text}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}