"use client";

import { useState } from "react";
import { Todo } from "@/types";
import { AddTodoForm } from "@/components/AddTodoForm";
import { TodoList } from "@/components/TodoList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: crypto.randomUUID(), text: "Learn React", completed: true },
    { id: crypto.randomUUID(), text: "Build a Todo App", completed: false },
    { id: crypto.randomUUID(), text: "Deploy to production", completed: false },
  ]);

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]);
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Todo App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AddTodoForm addTodo={addTodo} />
          <TodoList todos={todos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} />
        </CardContent>
      </Card>
    </div>
  );
}