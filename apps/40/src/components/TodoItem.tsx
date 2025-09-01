"use client";

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TodoItemProps {
  todo: {
    id: string;
    text: string;
    completed: boolean;
  };
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
        />
        <label
          htmlFor={`todo-${todo.id}`}
          className={`text-lg ${todo.completed ? 'line-through text-gray-500' : ''}`}
        >
          {todo.text}
        </label>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(todo.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};

export default TodoItem;