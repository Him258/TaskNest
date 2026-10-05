import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  User,
  Tag,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Activity,
  Plus,
} from 'lucide-react';

export default function TaskDetailModal({ taskId, onClose, onTaskUpdated, onTaskDeleted, members = [] }) {
  const { user, canEditTask, canDeleteTask } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'comments' | 'history'

  // Editable state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Audit history for task
  const [history, setHistory] = useState([]);

  const isEditable = canEditTask(task);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const [taskRes, commentsRes, activityRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get(`/tasks/${taskId}/comments`),
        api.get(`/tasks/${taskId}/activity`),
      ]);

      const t = taskRes.data;
      setTask(t);
      setTitle(t.title || '');
      setDescription(t.description || '');
      setStatus(t.status || 'TODO');
      setPriority(t.priority || 'MEDIUM');
      setAssignee(t.assignee?._id || t.assignee || '');
      setDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
      setLabelsInput(t.labels ? t.labels.join(', ') : '');
      setAttachments(t.attachments || []);
      setComments(commentsRes.data || []);
      setHistory(activityRes.data || []);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isEditable) return;
    try {
      const labels = labelsInput.split(',').map((l) => l.trim()).filter(Boolean);
      const res = await api.put(`/tasks/${taskId}`, {
        title,
        description,
        status,
        priority,
        assignee: assignee || null,
        dueDate: dueDate || null,
        labels,
        attachments,
      });

      setTask(res.data);
      onTaskUpdated(res.data);
      // Refresh task activity history
      const actRes = await api.get(`/tasks/${taskId}/activity`);
      setHistory(actRes.data || []);
      alert('Task updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!canDeleteTask) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        onTaskDeleted(taskId);
        onClose();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete task');
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setCommenting(true);
      const res = await api.post(`/tasks/${taskId}/comments`, {
        text: commentText,
      });
      setComments([...comments, res.data]);
      setCommentText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const addAttachment = () => {
    if (!newAttachmentName || !newAttachmentUrl) return;
    setAttachments([...attachments, { filename: newAttachmentName, url: newAttachmentUrl }]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const formatActivitySentence = (h) => {
    const userName = h.user?.name || h.user?.email || 'Someone';

    switch (h.action) {
      case 'TASK_CREATE':
        return `${userName} created this task`;
      case 'TASK_STATUS_CHANGE':
        return `${userName} changed status from ${h.oldValue} to ${h.newValue}`;
      case 'TASK_PRIORITY_CHANGE':
        return `${userName} changed priority from ${h.oldValue} to ${h.newValue}`;
      case 'TASK_ASSIGNEE_CHANGE':
        return `${userName} changed assignee from ${h.oldValue || 'Unassigned'} to ${h.newValue || 'Unassigned'}`;
      case 'TASK_DUE_DATE_CHANGE':
        return `${userName} updated due date from ${h.oldValue || 'None'} to ${h.newValue || 'None'}`;
      case 'TASK_LABELS_CHANGE': {
        const labels = Array.isArray(h.newValue) ? h.newValue.map((l) => '#' + l).join(', ') : h.newValue;
        return `${userName} updated labels to ${labels || 'none'}`;
      }
      case 'TASK_ATTACHMENT_CHANGE':
        return `${userName} updated attachments (${h.newValue} total attachment(s))`;
      case 'TASK_UPDATE':
        return `${userName} updated task details`;
      default:
        return `${userName} performed ${h.action}`;
    }
  };

  if (loading || !task) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center text-slate-300">
          Loading task details...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {task.project?.name || 'Task'}
            </span>
            <span className="text-xs text-slate-400">
              Created by {task.createdBy?.name || 'User'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {canDeleteTask && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'details'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Task Details</span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'comments'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments ({comments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity History ({history.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {!isEditable && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Read-only mode: Only assigned member, task creator, or ADMIN/OWNER can edit.</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-75"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  disabled={!isEditable}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75 resize-none"
                />
              </div>

              {/* Grid Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    disabled={!isEditable}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    disabled={!isEditable}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Assignee
                  </label>
                  <select
                    disabled={!isEditable}
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user._id} value={m.user._id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    disabled={!isEditable}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Labels (comma-separated)
                </label>
                <input
                  type="text"
                  disabled={!isEditable}
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="frontend, ui, urgent"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-75"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Attachments
                </label>
                <div className="space-y-1.5 mb-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center space-x-1.5 font-medium"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{att.filename}</span>
                      </a>
                      {isEditable && (
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isEditable && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="File name"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex-1 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="URL (e.g. https://...)"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex-1 outline-none"
                    />
                    <button
                      type="button"
                      onClick={addAttachment}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-300">{c.user?.name || 'User'}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 mb-1">
                  Tip: Type <code className="text-indigo-400 font-mono">@user@email.com</code> to mention a teammate.
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={commenting || !commentText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Activity History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No activity logged for this task yet.
                </div>
              ) : (
                history.map((h) => (
                  <div key={h._id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-start space-x-3 hover:border-slate-700/80 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-200 leading-snug">
                        {formatActivitySentence(h)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(h.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'details' && isEditable && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
