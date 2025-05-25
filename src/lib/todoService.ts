import { Todo } from '@/components/todo-form';

export interface TodoResponse {
  data?: any;
  error?: string;
}

export class TodoService {
  private static baseUrl = '/api/todos';

  static async fetchTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(this.baseUrl);
      const result: TodoResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch todos');
      }

      return (result.data || []).map((todo: any) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: new Date(todo.created_at),
      }));
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  static async createTodo(
    todoData: Omit<Todo, 'id' | 'createdAt'>,
  ): Promise<Todo> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });

      const result: TodoResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to create todo');
      }

      return {
        id: result.data.id,
        title: result.data.title,
        completed: result.data.completed,
        createdAt: new Date(result.data.created_at),
      };
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  static async updateTodo(todo: Todo): Promise<Todo> {
    try {
      const response = await fetch(`${this.baseUrl}/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: todo.title,
          completed: todo.completed,
        }),
      });

      const result: TodoResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to update todo');
      }

      return {
        id: result.data.id,
        title: result.data.title,
        completed: result.data.completed,
        createdAt: new Date(result.data.created_at),
      };
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  static async deleteTodo(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      const result: TodoResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to delete todo');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  static async toggleTodo(id: string, completed: boolean): Promise<Todo> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      const result: TodoResponse = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to toggle todo');
      }

      return {
        id: result.data.id,
        title: result.data.title,
        completed: result.data.completed,
        createdAt: new Date(result.data.created_at),
      };
    } catch (error) {
      console.error('Error toggling todo:', error);
      throw error;
    }
  }
}
