"use client";

import { Todo } from '@/types';
import TodoItem from './TodoItem';
import { Card, CardContent } from "@/components/ui/card";

type TodoListProps = {
  todos: Todo[];
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
};

const TodoList = ({ todos, toggleTodo, deleteTodo }: TodoListProps) => {
  return (
    <Card>
      <CardContent className="p-2">
        {todos.length > 0 ? (
          <div className="space-y-1">
            {todos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                toggleTodo={toggleTodo}
                deleteTodo={deleteTodo}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-4">No todos yet. Add one!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoList;