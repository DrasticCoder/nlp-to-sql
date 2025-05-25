'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Omit<Todo, 'id' | 'createdAt'> | Todo) => void;
  todo?: Todo | null;
  mode: 'create' | 'edit';
}

export const TodoForm: React.FC<TodoFormProps> = ({
  isOpen,
  onClose,
  onSave,
  todo,
  mode,
}) => {
  const [title, setTitle] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (todo && mode === 'edit') {
      setTitle(todo.title);
      setCompleted(todo.completed);
    } else {
      setTitle('');
      setCompleted(false);
    }
  }, [todo, mode, isOpen]);

  const handleSave = () => {
    if (!title.trim()) return;

    if (mode === 'edit' && todo) {
      onSave({
        ...todo,
        title: title.trim(),
        completed,
      });
    } else {
      onSave({
        title: title.trim(),
        completed,
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setCompleted(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter task title..."
              autoFocus
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(checked) => setCompleted(checked as boolean)}
            />
            <Label htmlFor="completed">Mark as completed</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {mode === 'create' ? 'Create Task' : 'Update Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
