export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done";

export type TaskPriority =
  | "low"
  | "medium"
  | "high";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  projects: Project[];
  tasks: Task[];
}

export interface TaskFilters {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionPercentage: number;
}