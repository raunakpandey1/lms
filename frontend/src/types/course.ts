export interface Course {
  id: number;
  title: string;
  description: string;
  is_published: boolean;
  instructor: number;
  instructor_name: string;
  created_at: string;
  updated_at: string;
}

export interface CourseRequest {
  title: string;
  description: string;
  is_published: boolean;
}

export interface Enrollment {
  id: number;
  student_username: string;
  course: Course;
  joined_at: string;
}