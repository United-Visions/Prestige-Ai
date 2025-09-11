import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { TodoItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim() === '') return;
    
    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date(),
    };
    
    setTodos(prevTodos => [...prevTodos, newTodo]);
    setInputValue('');
  };

  const deleteTodo = (id: string) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Todo App</h1>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new todo..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Button onClick={addTodo} className="px-4 py-2">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No todos yet. Add one above!</p>
        ) : (
          todos.map(todo => (
            <Card key={todo.id} className="p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {todo.completed && <Check className="h-3 w-3" />}
                </button>
                
                <span
                  className={`flex-1 ${
                    todo.completed
                      ? 'line-through text-gray-500'
                      : 'text-gray-900'
                  }`}
                >
                  {todo.text}
                </span>
                
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {todos.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {todos.filter(todo => !todo.completed).length} of {todos.length} todos remaining
        </div>
      )}
    </div>
  );
};