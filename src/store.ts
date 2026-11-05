
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";

import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  Database,
  Project,
  Task,
  TaskFilters,
  ProjectSummary,
  TaskStatus,
  TaskPriority,
} from "./types.js";

const EMPTY_DATABASE: Database = {
  projects: [],
  tasks: [],
};

export class TaskStore {
  private readonly filePath: string;

  constructor(
    filePath = path.resolve(
      process.cwd(),
      "data",
      "taskpilot.json"
    )
  ) {
    this.filePath = filePath;
  }

  private async readDatabase(): Promise<Database> {
    try {
      const content = await readFile(
        this.filePath,
        "utf-8"
      );

      return JSON.parse(content) as Database;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return {
          projects: [],
          tasks: [],
        };
      }

      throw error;
    }
  }

  private async writeDatabase(
    database: Database
  ): Promise<void> {
    await mkdir(path.dirname(this.filePath), {
      recursive: true,
    });

    const temporaryPath = `${this.filePath}.tmp`;

    await writeFile(
      temporaryPath,
      JSON.stringify(database, null, 2),
      "utf-8"
    );

    await rename(temporaryPath, this.filePath);
  }

  async createProject(
    name: string,
    description = ""
  ): Promise<Project> {
    const database = await this.readDatabase();

    const now = new Date().toISOString();

    const project: Project = {
      id: randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };

    database.projects.push(project);

    await this.writeDatabase(database);

    return project;
  }

  async listProjects(): Promise<Project[]> {
    const database = await this.readDatabase();

    return database.projects;
  }

  async createTask(input: {
    projectId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }): Promise<Task> {
    const database = await this.readDatabase();

    const projectExists = database.projects.some(
      (project) => project.id === input.projectId
    );

    if (!projectExists) {
      throw new Error("Project not found.");
    }

    const now = new Date().toISOString();

    const task: Task = {
      id: randomUUID(),
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? "",
      status: "todo",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    database.tasks.push(task);

    await this.writeDatabase(database);

    return task;
  }

  async listTasks(
    filters: TaskFilters = {}
  ): Promise<Task[]> {
    const database = await this.readDatabase();

    return database.tasks.filter((task) => {
      if (
        filters.projectId &&
        task.projectId !== filters.projectId
      ) {
        return false;
      }

      if (
        filters.status &&
        task.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.priority &&
        task.priority !== filters.priority
      ) {
        return false;
      }

      return true;
    });
  }

  async updateTask(
    id: string,
    updates: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
    }
  ): Promise<Task> {
    const database = await this.readDatabase();

    const task = database.tasks.find(
      (item) => item.id === id
    );

    if (!task) {
      throw new Error("Task not found.");
    }

    Object.assign(task, updates, {
      updatedAt: new Date().toISOString(),
    });

    await this.writeDatabase(database);

    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    const database = await this.readDatabase();

    const originalLength = database.tasks.length;

    database.tasks = database.tasks.filter(
      (task) => task.id !== id
    );

    if (database.tasks.length === originalLength) {
      return false;
    }

    await this.writeDatabase(database);

    return true;
  }

  async getProjectSummary(
    projectId: string
  ): Promise<ProjectSummary> {
    const database = await this.readDatabase();

    const project = database.projects.find(
      (item) => item.id === projectId
    );

    if (!project) {
      throw new Error("Project not found.");
    }

    const tasks = database.tasks.filter(
      (task) => task.projectId === projectId
    );

    const completedTasks = tasks.filter(
      (task) => task.status === "done"
    ).length;

    const pendingTasks = tasks.filter(
      (task) => task.status === "todo"
    ).length;

    const inProgressTasks = tasks.filter(
      (task) => task.status === "in_progress"
    ).length;

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const overdueTasks = tasks.filter(
      (task) =>
        task.status !== "done" &&
        task.dueDate !== null &&
        task.dueDate < today
    ).length;

    const completionPercentage =
      tasks.length === 0
        ? 0
        : Math.round(
            (completedTasks / tasks.length) * 100
          );

    return {
      projectId,
      projectName: project.name,
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      completionPercentage,
    };
  }

  async listOverdueTasks(): Promise<Task[]> {
    const database = await this.readDatabase();

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    return database.tasks.filter(
      (task) =>
        task.status !== "done" &&
        task.dueDate !== null &&
        task.dueDate < today
    );
  }
}
