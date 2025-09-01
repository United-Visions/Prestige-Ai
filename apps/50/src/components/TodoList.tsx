"use client";

import React from 'react';
import TodoItem from './TodoItem';
import { Card, CardContent } from "@/components/ui/card";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete }) => {
  if (todos.length === 0) {
    return (
      <p className="text-center text-gray-500 mt-8">No todos yet! Add one above.</p>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardContent className="p-0">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default TodoList;