'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit } from 'lucide-react';
import { TodoForm, Todo } from './todo-form';

interface TodoListProps {
  todos: Todo[];
  onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onToggleTodo: (id: string) => void;
  loading?: boolean;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleTodo,
  loading = false,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const handleAddClick = () => {
    setFormMode('create');
    setEditingTodo(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (todo: Todo) => {
    setFormMode('edit');
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  const handleFormSave = (todoData: Omit<Todo, 'id' | 'createdAt'> | Todo) => {
    if (formMode === 'create') {
      onAddTodo(todoData as Omit<Todo, 'id' | 'createdAt'>);
    } else {
      onUpdateTodo(todoData as Todo);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTodo(null);
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Todo List</span>
            <Button
              onClick={handleAddClick}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading todos...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => onToggleTodo(todo.id)}
                    />
                    <div className="flex-1">
                      <p
                        className={`${
                          todo.completed ? 'line-through text-gray-500' : ''
                        }`}
                      >
                        {todo.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {todo.createdAt
                          ? new Date(todo.createdAt).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                    <Badge variant={todo.completed ? 'secondary' : 'default'}>
                      {todo.completed ? 'Completed' : 'Pending'}
                    </Badge>
                    <Button
                      onClick={() => handleEditClick(todo)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onDeleteTodo(todo.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {todos.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No todos yet. Add one to get started!</p>
                    <p className="text-sm mt-2">
                      You can add todos manually or use the chat interface to
                      say &quot;add a new task&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <TodoForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        todo={editingTodo}
        mode={formMode}
      />
    </>
  );
};
