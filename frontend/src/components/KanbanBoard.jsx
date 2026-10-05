import React, { useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Plus, CheckCircle2, Clock, Eye, AlertCircle } from 'lucide-react';
import { getSocket } from '../services/socket';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'border-slate-500/40 text-slate-300' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-indigo-500/40 text-indigo-400' },
  { id: 'REVIEW', title: 'In Review', color: 'border-amber-500/40 text-amber-400' },
  { id: 'DONE', title: 'Done', color: 'border-emerald-500/40 text-emerald-400' },
];

export default function KanbanBoard({
  tasks,
  onTaskStatusChange,
  onTaskClick,
  onOpenCreateTask,
  canCreateTask,
  projectId,
}) {
  // Join Socket room for current project & handle real-time sync
  useEffect(() => {
    const socket = getSocket();
    if (socket && projectId) {
      socket.emit('join:project', projectId);
      return () => {
        socket.emit('leave:project', projectId);
      };
    }
  }, [projectId]);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId;
    onTaskStatusChange(draggableId, newStatus);
  };

  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.id);

          return (
            <div
              key={col.id}
              className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex flex-col max-h-[80vh] min-h-[450px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    col.id === 'TODO' ? 'bg-slate-400' :
                    col.id === 'IN_PROGRESS' ? 'bg-indigo-500' :
                    col.id === 'REVIEW' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                {canCreateTask && col.id === 'TODO' && (
                  <button
                    onClick={onOpenCreateTask}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    title="Add Task"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto space-y-3 p-1 rounded-xl transition-colors ${
                      snapshot.isDraggingOver ? 'bg-indigo-950/20 ring-1 ring-indigo-500/30' : ''
                    }`}
                  >
                    {colTasks.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-500">
                        No tasks in {col.title}
                      </div>
                    ) : (
                      colTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <TaskCard
                              task={task}
                              provided={dragProvided}
                              snapshot={dragSnapshot}
                              onClick={() => onTaskClick(task)}
                            />
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
