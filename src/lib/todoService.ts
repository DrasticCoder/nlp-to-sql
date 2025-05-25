import { supabase } from './supabaseClient';

export const todoService = {
  async getAllTodos(): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  },

  async createTodo(title: string): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title, completed: false }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  },

  async updateTodo(
    id: string,
    title: string,
    completed: boolean,
  ): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ title, completed })
        .match({ id })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  },

  async deleteTodo(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('todos').delete().match({ id });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  },

  async toggleTodo(id: string, completed: boolean): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ completed })
        .match({ id })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error toggling todo:', error);
      throw error;
    }
  },
};
