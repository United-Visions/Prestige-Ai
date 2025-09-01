"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddTodoFormProps {
  onAddTodo: (text: string) => void;
}

const AddTodoForm: React.FC<AddTodoFormProps> = ({ onAddTodo }) => {
  const [newTodoText, setNewTodoText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      onAddTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mb-6">
      <Input
        type="text"
        placeholder="Add a new todo..."
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        className="flex-grow"
      />
      <Button type="submit">Add Todo</Button>
    </form>
  );
};

export default AddTodoForm;