'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export default function EnhancedCalendar() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Load todos from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('calendar_todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (e) {
        setTodos([]);
      }
    }
  }, []);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendar_todos', JSON.stringify(todos));
  }, [todos]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        completed: false,
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      };
      setTodos(prev => [...prev, newTodo]);
      setInputValue('');
    }
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const getTodosForDate = (date: Date | undefined) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return todos.filter(todo => todo.date === dateStr);
  };

  const selectedTodos = getTodosForDate(selectedDate);

  return (
    <div className="relative">
      {/* Calendar Link in Nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isOpen
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        Calendar
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[320px] bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
            />

            {/* Todo Input */}
            <div className="mt-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add todo and press Enter..."
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Todos for Selected Date */}
            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
              {selectedTodos.length > 0 ? (
                selectedTodos.map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg group"
                  >
                    <div
                      className={cn(
                        "flex-1 text-sm cursor-pointer",
                        todo.completed && "line-through text-slate-400"
                      )}
                      onClick={() => toggleTodo(todo.id)}
                    >
                      {todo.text}
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">
                  No todos for this date
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}