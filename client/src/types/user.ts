export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  rating: number;
  rank: string;
  role: 'user' | 'admin';
  has_ai_api_key?: boolean;
  ai_base_url?: string | null;
  ai_model?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
