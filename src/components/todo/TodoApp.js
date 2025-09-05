import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
export const TodoApp = () => {
    const [todos, setTodos] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const addTodo = () => {
        if (inputValue.trim() === '')
            return;
        const newTodo = {
            id: crypto.randomUUID(),
            text: inputValue.trim(),
            completed: false,
            createdAt: new Date(),
        };
        setTodos(prevTodos => [...prevTodos, newTodo]);
        setInputValue('');
    };
    const deleteTodo = (id) => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    };
    const toggleTodo = (id) => {
        setTodos(prevTodos => prevTodos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    };
    return (_jsxs("div", { className: "max-w-md mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6 text-center", children: "Todo App" }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("input", { type: "text", value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyPress: handleKeyPress, placeholder: "Add a new todo...", className: "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), _jsx(Button, { onClick: addTodo, className: "px-4 py-2", children: _jsx(Plus, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "space-y-2", children: todos.length === 0 ? (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No todos yet. Add one above!" })) : (todos.map(todo => (_jsx(Card, { className: "p-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => toggleTodo(todo.id), className: `flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${todo.completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 hover:border-green-400'}`, children: todo.completed && _jsx(Check, { className: "h-3 w-3" }) }), _jsx("span", { className: `flex-1 ${todo.completed
                                    ? 'line-through text-gray-500'
                                    : 'text-gray-900'}`, children: todo.text }), _jsx("button", { onClick: () => deleteTodo(todo.id), className: "flex-shrink-0 p-1 text-red-500 hover:text-red-700 transition-colors", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }) }, todo.id)))) }), todos.length > 0 && (_jsxs("div", { className: "mt-4 text-sm text-gray-500 text-center", children: [todos.filter(todo => !todo.completed).length, " of ", todos.length, " todos remaining"] }))] }));
};
