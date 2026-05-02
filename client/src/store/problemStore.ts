import { create } from 'zustand';
import type { Problem } from '@/types/problem';
import { problemApi } from '@/api';

interface ProblemState {
  currentProblem: Problem | null;
  isLoading: boolean;

  fetchProblem: (id: number) => Promise<void>;
  setCurrentProblem: (problem: Problem | null) => void;
}

export const useProblemStore = create<ProblemState>((set) => ({
  currentProblem: null,
  isLoading: false,

  fetchProblem: async (id: number) => {
    set({ isLoading: true });
    try {
      const problem = await problemApi.getProblem(id);
      set({ currentProblem: problem, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentProblem: (problem: Problem | null) => {
    set({ currentProblem: problem });
  },
}));
