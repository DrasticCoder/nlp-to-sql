'use client';

import React, { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { TodoList } from '@/components/todo-list';
import { Todo } from '@/components/todo-form';
import { TodoService } from '@/lib/todoService';

const Page = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await TodoService.fetchTodos();
        setTodos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch todos');
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  const handleAddTodo = async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
    try {
      const newTodo = await TodoService.createTodo(todoData);
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add todo');
    }
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
    try {
      const updated = await TodoService.updateTodo(updatedTodo);
      setTodos((prev) =>
        prev.map((todo) => (todo.id === updated.id ? updated : todo)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await TodoService.deleteTodo(id);
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    }
  };

  const handleToggleTodo = async (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    try {
      const updated = await TodoService.toggleTodo(id, !target.completed);
      setTodos((prev) => prev.map((todo) => (todo.id === id ? updated : todo)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle todo');
    }
  };

  const handleCommand = (command: string) => {
    console.log('Processing command:', command);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            NLP-to-SQL Todo Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your todos using natural language commands
          </p>
          {error && (
            <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          <ChatInterface onCommand={handleCommand} />
          <TodoList
            todos={todos}
            onAddTodo={handleAddTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            onToggleTodo={handleToggleTodo}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
