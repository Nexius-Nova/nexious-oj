export interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  creator_id: number;
  is_public: boolean;
  problems?: ContestProblem[];
}

export interface ContestProblem {
  id: number;
  title: string;
  difficulty: string;
  order: number;
}
