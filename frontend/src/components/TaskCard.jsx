import React from 'react';
import { Clock, Paperclip, MessageSquare, AlertCircle } from 'lucide-react';

export default function TaskCard({ task, onClick, provided, snapshot }) {
  const getPriorityBadge = (p) => {
    switch (p) {
      case 'HIGH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      onClick={onClick}
      className={`glass-card p-3.5 rounded-xl border transition-all cursor-pointer group select-none ${
        snapshot?.isDragging
          ? 'ring-2 ring-indigo-500 shadow-2xl scale-[1.02] bg-slate-800'
          : 'hover:border-indigo-500/40'
      }`}
    >
      {/* Labels & Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-1">
          {task.labels && task.labels.map((lbl, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-800 text-indigo-300 rounded-md border border-slate-700"
            >
              #{lbl}
            </span>
          ))}
        </div>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-semibold border rounded-md uppercase tracking-wider ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      {/* Title & Description */}
      <h4 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 mb-1">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
        <div className="flex items-center space-x-2">
          {task.dueDate && (
            <div
              className={`flex items-center space-x-1 ${
                isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {task.attachments?.length > 0 && (
            <div className="flex items-center space-x-0.5">
              <Paperclip className="w-3 h-3 text-slate-400" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center space-x-1">
          {task.assignee ? (
            <div
              className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[9px] shadow"
              title={`Assigned to ${task.assignee.name || 'User'}`}
            >
              {task.assignee.name ? task.assignee.name.charAt(0).toUpperCase() : 'U'}
            </div>
          ) : (
            <span className="text-slate-500 italic">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
