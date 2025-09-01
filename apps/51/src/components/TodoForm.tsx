"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TodoFormProps {
  onAdd: (text: string) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ onAdd }) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAdd(inputText.trim());
      setInputText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 p-4">
      <Input
        type="text"
        placeholder="Add a new todo..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-grow"
      />
      <Button type="submit">
        <Plus className="h-4 w-4 mr-2" /> Add Todo
      </Button>
    </form>
  );
};

export default TodoForm;