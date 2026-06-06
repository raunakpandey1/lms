export type UserRole = "instructor" | "student";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
  role: UserRole;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}