
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";

import { TaskStore } from "../src/store.js";

test("TaskPilot storage lifecycle", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "taskpilot-test-")
  );

  const filePath = path.join(
    directory,
    "database.json"
  );

  try {
    const store = new TaskStore(filePath);

    // 1. Create project
    const project = await store.createProject(
      "MCP Integration",
      "Testing project"
    );

    assert.equal(
      project.name,
      "MCP Integration"
    );

    // 2. Create task
    const task = await store.createTask({
      projectId: project.id,
      title: "Build MCP server",
      priority: "high",
    });

    assert.equal(task.status, "todo");
    assert.equal(task.priority, "high");

    // 3. Test filtering
    const filtered = await store.listTasks({
      projectId: project.id,
      priority: "high",
    });

    assert.equal(filtered.length, 1);

    // 4. Test updating
    const updated = await store.updateTask(
      task.id,
      {
        status: "done",
      }
    );

    assert.equal(updated.status, "done");

    // 5. Test analytics
    const summary = await store.getProjectSummary(
      project.id
    );

    assert.equal(summary.totalTasks, 1);
    assert.equal(summary.completedTasks, 1);
    assert.equal(summary.completionPercentage, 100);

    // 6. Test persistence
    const restartedStore = new TaskStore(filePath);

    const persistedProjects =
      await restartedStore.listProjects();

    assert.equal(persistedProjects.length, 1);

    const persistedTasks =
      await restartedStore.listTasks();

    assert.equal(persistedTasks.length, 1);

    // 7. Test deletion
    const deleted = await restartedStore.deleteTask(
      task.id
    );

    assert.equal(deleted, true);

    const remainingTasks =
      await restartedStore.listTasks();

    assert.equal(remainingTasks.length, 0);

    // 8. Test invalid project reference
    await assert.rejects(
      () =>
        restartedStore.createTask({
          projectId: "00000000-0000-4000-8000-000000000000",
          title: "Invalid task",
        }),
      /Project not found/
    );

  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
