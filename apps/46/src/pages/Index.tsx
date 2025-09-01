"use client";

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import TodoForm from '../components/TodoForm';
import TodoList from '../components/TodoList';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const TodosPage: React.FC = () => {
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">My Todo App</CardTitle>
          <CardDescription>Organize your tasks efficiently.</CardDescription>
        </CardHeader>
        <TodoForm onAdd={addTodo} />
        <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
      </Card>
    </div>
  );
};

export default TodosPage;