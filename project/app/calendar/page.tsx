'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import PageShell from '@/components/PageShell';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export default function CalendarPage() {
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
  const formattedDate = selectedDate?.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar
          title="Calendar"
          subtitle="Plan and track your eco-friendly activities"
        />
        <PageShell className="flex-1 p-8">
          <div className="mx-auto max-w-4xl">
            {/* Large Centered Calendar */}
            <div className="rounded-xl border bg-white shadow-sm p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-green-900">Selected: {formattedDate}</h2>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add todo and press Enter..."
                  className="flex-1 ml-4 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="mx-auto"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center text-lg font-semibold",
                  caption_label: "text-green-900",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-between",
                  head_cell: "text-slate-500 font-medium text-sm w-12 h-12 flex items-center justify-center",
                  row: "flex w-full justify-between mt-2",
                  cell: cn(
                    "relative w-12 h-12 flex items-center justify-center text-center text-sm p-0 hover:bg-slate-100 rounded-full transition-colors",
                    "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
                  ),
                  day: cn(
                    "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors"
                  ),
                  day_today: "bg-green-100 text-green-900 font-semibold",
                  day_selected: "bg-green-600 text-white hover:bg-green-500 hover:text-white font-semibold",
                  day_outside: "opacity-50",
                }}
              />
            </div>

            {/* All Todos Section */}
            <div className="rounded-xl border bg-white shadow-sm p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-6">All Tasks</h2>
              
              {/* All Todos List */}
              <div className="space-y-2">
                {todos.length > 0 ? (
                  todos
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(todo => {
                      const todoDate = new Date(todo.date);
                      const dateString = todoDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      
                      return (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
                        >
                          <div
                            className={cn(
                              "flex-1 text-sm cursor-pointer flex items-center gap-3",
                              todo.completed && "line-through text-slate-400"
                            )}
                            onClick={() => toggleTodo(todo.id)}
                          >
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              {dateString}
                            </span>
                            {todo.text}
                          </div>
                          <button
                            onClick={() => removeTodo(todo.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No tasks yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </PageShell>
      </div>
    </div>
  );
}