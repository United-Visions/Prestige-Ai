import { Todo } from "@/pages/Index";
import TodoItem from "./TodoItem";

type TodoListProps = {
  todos: Todo[];
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
};

export default function TodoList({ todos, toggleTodo, deleteTodo }: TodoListProps) {
  return (
    <div className="space-y-2">
      {todos.length > 0 ? (
        todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
          />
        ))
      ) : (
        <p className="text-center text-muted-foreground">No todos yet. Add one!</p>
      )}
    </div>
  );
}