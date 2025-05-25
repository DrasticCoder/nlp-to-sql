'use client';

import React, { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { TodoList } from '@/components/todo-list';
import { Todo } from '@/components/todo-form';
import { supabase } from '@/lib/supabaseClient';

const Page = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Fetch todos
  useEffect(() => {
    const fetchTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error.message);
        return;
      }

      const mappedTodos: Todo[] = (data || []).map((todo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: new Date(todo.created_at),
      }));

      setTodos(mappedTodos);
    };

    fetchTodos();
  }, []);

  const handleAddTodo = async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('todos')
      .insert([{ title: todoData.title, completed: todoData.completed }])
      .select()
      .single();

    if (error) {
      console.error('Error adding todo:', error.message);
      return;
    }

    const newTodo: Todo = {
      id: data.id,
      title: data.title,
      completed: data.completed,
      createdAt: new Date(data.created_at),
    };

    setTodos((prev) => [newTodo, ...prev]);
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
    const { data, error } = await supabase
      .from('todos')
      .update({
        title: updatedTodo.title,
        completed: updatedTodo.completed,
      })
      .eq('id', updatedTodo.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating todo:', error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === updatedTodo.id
          ? {
              ...todo,
              title: data.title,
              completed: data.completed,
              createdAt: new Date(data.created_at),
            }
          : todo,
      ),
    );
  };

  const handleDeleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.error('Error deleting todo:', error.message);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const handleToggleTodo = async (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    const { data, error } = await supabase
      .from('todos')
      .update({ completed: !target.completed })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling todo:', error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: data.completed } : todo,
      ),
    );
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          <ChatInterface onCommand={handleCommand} />
          <TodoList
            todos={todos}
            onAddTodo={handleAddTodo}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            onToggleTodo={handleToggleTodo}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
