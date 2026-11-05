
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import { TaskStore } from "./store.js";

const store = new TaskStore();

const server = new McpServer({
  name: "taskpilot-mcp",
  version: "1.0.0",
});

// --------------------------------------------------
// TOOL 1: CREATE PROJECT
// --------------------------------------------------

server.registerTool(
  "create_project",
  {
    description:
      "Create a new project with a name and optional description.",

    inputSchema: z.object({
      name: z.string().min(1).max(80)
        .describe("Project name"),

      description: z.string().max(500)
        .optional()
        .describe("Project description"),
    }),
  },

  async ({ name, description }) => {
    try {
      const project = await store.createProject(
        name,
        description
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 2: LIST PROJECTS
// --------------------------------------------------

server.registerTool(
  "list_projects",
  {
    description:
      "List all existing projects.",

    inputSchema: z.object({}),
  },

  async () => {
    try {
      const projects = await store.listProjects();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 3: CREATE TASK
// --------------------------------------------------

server.registerTool(
  "create_task",
  {
    description:
      "Create a task inside an existing project.",

    inputSchema: z.object({
      projectId: z.string().uuid(),

      title: z.string().min(1).max(150),

      description: z.string().max(1000).optional(),

      priority: z.enum([
        "low",
        "medium",
        "high",
      ]).optional(),

      dueDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
  },

  async (input) => {
    try {
      const task = await store.createTask(input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 4: LIST TASKS
// --------------------------------------------------

server.registerTool(
  "list_tasks",
  {
    description:
      "List tasks with optional filters for project, status and priority.",

    inputSchema: z.object({
      projectId: z.string().uuid().optional(),

      status: z.enum([
        "todo",
        "in_progress",
        "done",
      ]).optional(),

      priority: z.enum([
        "low",
        "medium",
        "high",
      ]).optional(),
    }),
  },

  async (filters) => {
    try {
      const tasks = await store.listTasks(filters);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 5: UPDATE TASK
// --------------------------------------------------

server.registerTool(
  "update_task",
  {
    description:
      "Update the title, description, status, priority or deadline of an existing task.",

    inputSchema: z.object({
      id: z.string().uuid(),

      title: z.string().min(1).max(150).optional(),

      description: z.string().max(1000).optional(),

      status: z.enum([
        "todo",
        "in_progress",
        "done",
      ]).optional(),

      priority: z.enum([
        "low",
        "medium",
        "high",
      ]).optional(),

      dueDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }).refine(
      (data) =>
        Object.keys(data).length > 1,
      {
        message: "Provide at least one field to update.",
      }
    ),
  },

  async ({ id, ...updates }) => {
    try {
      const task = await store.updateTask(
        id,
        updates
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 6: DELETE TASK
// --------------------------------------------------

server.registerTool(
  "delete_task",
  {
    description:
      "Delete a task using its unique ID.",

    inputSchema: z.object({
      id: z.string().uuid(),
    }),
  },

  async ({ id }) => {
    try {
      const deleted = await store.deleteTask(id);

      if (!deleted) {
        return {
          content: [
            {
              type: "text",
              text: "Task not found.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Task ${id} deleted successfully.`,
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 7: PROJECT SUMMARY
// --------------------------------------------------

server.registerTool(
  "get_project_summary",
  {
    description:
      "Generate project analytics including task counts, completion percentage and overdue tasks.",

    inputSchema: z.object({
      projectId: z.string().uuid(),
    }),
  },

  async ({ projectId }) => {
    try {
      const summary =
        await store.getProjectSummary(projectId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// TOOL 8: OVERDUE TASKS
// --------------------------------------------------

server.registerTool(
  "list_overdue_tasks",
  {
    description:
      "Find all incomplete tasks whose deadlines have passed.",

    inputSchema: z.object({}),
  },

  async () => {
    try {
      const tasks = await store.listOverdueTasks();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

// --------------------------------------------------
// SHARED ERROR HANDLING
// --------------------------------------------------

function errorResult(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return {
    content: [
      {
        type: "text" as const,
        text: `TaskPilot error: ${message}`,
      },
    ],
    isError: true,
  };
}

// --------------------------------------------------
// START MCP SERVER
// --------------------------------------------------

void serveStdio(() => server);

console.error("TaskPilot MCP server started.");
