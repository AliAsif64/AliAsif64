import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import Modal from "../../components/Modal";

interface TeamMember {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: TeamMember | null;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  tasks: Task[];
}

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"];

export default function Projects() {
  const queryClient = useQueryClient();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });

  const createProject = useMutation({
    mutationFn: async () => (await api.post("/projects", { name: projectName })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowProjectForm(false);
      setProjectName("");
    },
  });

  const createTask = useMutation({
    mutationFn: async (projectId: string) => (await api.post("/projects/tasks", { projectId, title: taskTitle })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setTaskTitle("");
      setActiveProject(null);
    },
  });

  const moveTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/projects/tasks/${id}`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-slate-500">Organize work into projects and track tasks on a board.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowProjectForm(true)}>
          <Plus size={16} /> New project
        </button>
      </div>

      <div className="space-y-8">
        {projects.map((project) => (
          <div key={project.id} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{project.name}</h2>
              <button className="btn-secondary text-xs" onClick={() => setActiveProject(project.id)}>
                <Plus size={14} /> Add task
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {STATUSES.map((status) => (
                <div key={status} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {status.replace("_", " ")}
                  </div>
                  <div className="space-y-2">
                    {project.tasks
                      .filter((t) => t.status === status)
                      .map((task) => (
                        <div key={task.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                          <div className="font-medium">{task.title}</div>
                          {task.assignee && <div className="text-slate-400">{task.assignee.name}</div>}
                          <select
                            className="mt-2 w-full rounded border border-slate-200 text-xs"
                            value={task.status}
                            onChange={(e) => moveTask.mutate({ id: task.id, status: e.target.value })}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {projects.length === 0 && <div className="card p-8 text-center text-slate-400">No projects yet.</div>}
      </div>

      {showProjectForm && (
        <Modal title="New project" onClose={() => setShowProjectForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createProject.mutate();
            }}
          >
            <div>
              <label className="label">Project name</label>
              <input className="input" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
            </div>
            <button className="btn-primary w-full justify-center" disabled={createProject.isPending}>
              Create
            </button>
          </form>
        </Modal>
      )}

      {activeProject && (
        <Modal title="Add task" onClose={() => setActiveProject(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createTask.mutate(activeProject);
            }}
          >
            <div>
              <label className="label">Task title</label>
              <input className="input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
            </div>
            <button className="btn-primary w-full justify-center" disabled={createTask.isPending}>
              Add task
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
