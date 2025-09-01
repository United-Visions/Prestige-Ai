"use client";

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AddTodoForm from '@/components/AddTodoForm';
import TodoItem from '@/components/TodoItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const Index: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: uuidv4(),
      text,
      completed: false,
    };
    setTodos((prevTodos) => [...prevTodos, newTodo]);
  };

  const toggleTodo = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Todo App</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTodoForm onAddTodo={addTodo} />
          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-center text-gray-500">No todos yet! Add one above.</p>
            ) : (
              todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;