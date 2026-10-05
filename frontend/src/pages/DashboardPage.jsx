import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import SearchFilterBar from '../components/SearchFilterBar';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetailModal from '../components/TaskDetailModal';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateProjectModal from '../components/CreateProjectModal';
import { Plus, Folder, Layers, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const { activeOrg, canCreateProject, canCreateTask } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Pagination & Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignee: '',
    labels: '',
    dueBefore: '',
    dueAfter: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Modal states
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // 1. Fetch projects and members whenever active organization changes
  useEffect(() => {
    if (activeOrg) {
      fetchProjectsAndMembers();
    }
  }, [activeOrg]);

  // 2. Fetch tasks whenever active project or filters change
  useEffect(() => {
    if (activeProject) {
      fetchTasks(1);
    }
  }, [activeProject, filters]);

  // 3. Listen to Socket.IO real-time events for active project
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeProject) return;

    const handleTaskCreated = (newTask) => {
      console.log('Socket task:created', newTask);
      if (newTask.project === activeProject._id || newTask.project?._id === activeProject._id) {
        setTasks((prev) => [newTask, ...prev.filter((t) => t._id !== newTask._id)]);
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      console.log('Socket task:updated', updatedTask);
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    };

    const handleTaskDeleted = ({ taskId }) => {
      console.log('Socket task:deleted', taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [activeProject]);

  const fetchProjectsAndMembers = async () => {
    try {
      setLoadingProjects(true);
      const [projRes, memRes] = await Promise.all([
        api.get(`/projects?organizationId=${activeOrg._id}`),
        api.get(`/organizations/${activeOrg._id}/members`),
      ]);

      const projs = projRes.data || [];
      setProjects(projs);
      setMembers(memRes.data || []);

      if (projs.length > 0) {
        setActiveProject(projs[0]);
      } else {
        setActiveProject(null);
        setTasks([]);
      }
    } catch (err) {
      console.error('Failed to load projects/members:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTasks = async (page = 1) => {
    if (!activeProject) return;
    try {
      setLoadingTasks(true);
      const params = new URLSearchParams({
        organizationId: activeOrg._id,
        projectId: activeProject._id,
        page,
        limit: 50,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignee) params.append('assignee', filters.assignee);
      if (filters.labels) params.append('labels', filters.labels);
      if (filters.dueBefore) params.append('dueBefore', filters.dueBefore);
      if (filters.dueAfter) params.append('dueAfter', filters.dueAfter);

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data.tasks || []);
      setPagination(res.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchTasks(pagination.page); // Revert on failure
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Selector Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        {/* Projects list pill tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          {projects.map((p) => (
            <button
              key={p._id}
              onClick={() => setActiveProject(p)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeProject?._id === p._id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>{p.name}</span>
            </button>
          ))}

          {canCreateProject && (
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-indigo-400 hover:bg-indigo-600/10 border border-indigo-500/30 flex items-center space-x-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>

        {/* Create Task Button */}
        {activeProject && canCreateTask && (
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {!activeProject && !loadingProjects ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">No Projects Found</h3>
          <p className="text-xs text-slate-400">
            Create your first project in <span className="text-indigo-300 font-semibold">{activeOrg?.name}</span> to start managing tasks.
          </p>
          {canCreateProject && (
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Advanced Search & Filter Bar */}
          <SearchFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            members={members}
          />

          {/* Kanban Drag-and-Drop Board */}
          {loadingTasks ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading tasks...</div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskClick={(task) => setSelectedTaskId(task._id)}
              onOpenCreateTask={() => setShowCreateTaskModal(true)}
              canCreateTask={canCreateTask}
              projectId={activeProject?._id}
            />
          )}
        </>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t._id !== deletedId));
          }}
          members={members}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && activeProject && (
        <CreateTaskModal
          projectId={activeProject._id}
          organizationId={activeOrg._id}
          onClose={() => setShowCreateTaskModal(false)}
          onTaskCreated={(newTask) => setTasks((prev) => [newTask, ...prev])}
          members={members}
        />
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <CreateProjectModal
          organizationId={activeOrg._id}
          onClose={() => setShowCreateProjectModal(false)}
          onProjectCreated={(newProject) => {
            setProjects((prev) => [...prev, newProject]);
            setActiveProject(newProject);
          }}
        />
      )}
    </div>
  );
}
