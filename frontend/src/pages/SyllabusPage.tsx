import React, { useState, useEffect } from 'react';
import { Subject, Topic, TopicCreateInput, TopicUpdateInput, TopicStatus, TopicPriority } from '../types';
import { getSubjects, getSubjectTopics, createTopic, updateTopic, deleteTopic } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import {
  LayersIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ClockIcon,
  CheckIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../components/Icons';

interface SyllabusPageProps {
  initialSubjectId?: number | null;
}

export const SyllabusPage: React.FC<SyllabusPageProps> = ({ initialSubjectId }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialSubjectId || null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | TopicStatus>('all');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Topic Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TopicCreateInput>({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    estimated_duration_minutes: 60,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Topic Modal
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editForm, setEditForm] = useState<TopicUpdateInput>({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    estimated_duration_minutes: 60,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Topic Dialog
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Load all subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const data = await getSubjects();
        setSubjects(data);
        if (data.length > 0) {
          if (initialSubjectId && data.some((s) => s.id === initialSubjectId)) {
            setSelectedSubjectId(initialSubjectId);
          } else if (!selectedSubjectId) {
            setSelectedSubjectId(data[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, [initialSubjectId]);

  // Load topics when selected subject changes
  const loadTopicsForSelectedSubject = async () => {
    if (!selectedSubjectId) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    setError(null);
    try {
      const data = await getSubjectTopics(selectedSubjectId);
      setTopics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load syllabus topics');
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    loadTopicsForSelectedSubject();
  }, [selectedSubjectId]);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    if (!createForm.title.trim()) {
      setCreateError('Topic title is required');
      return;
    }
    if ((createForm.estimated_duration_minutes || 0) <= 0) {
      setCreateError('Estimated duration must be positive');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createTopic(selectedSubjectId, {
        title: createForm.title.trim(),
        description: createForm.description?.trim() || undefined,
        status: createForm.status,
        priority: createForm.priority,
        estimated_duration_minutes: Number(createForm.estimated_duration_minutes),
      });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        status: 'not_started',
        priority: 'medium',
        estimated_duration_minutes: 60,
      });
      await loadTopicsForSelectedSubject();
      // Refresh subject counts
      const updatedSubs = await getSubjects();
      setSubjects(updatedSubs);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create topic');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setEditForm({
      title: topic.title,
      description: topic.description || '',
      status: topic.status,
      priority: topic.priority,
      estimated_duration_minutes: topic.estimated_duration_minutes,
    });
    setEditError(null);
  };

  const handleEditTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    if (!editForm.title?.trim()) {
      setEditError('Topic title is required');
      return;
    }
    if ((editForm.estimated_duration_minutes || 0) <= 0) {
      setEditError('Estimated duration must be positive');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateTopic(editingTopic.id, {
        title: editForm.title.trim(),
        description: editForm.description?.trim() || undefined,
        status: editForm.status,
        priority: editForm.priority,
        estimated_duration_minutes: Number(editForm.estimated_duration_minutes),
      });
      setEditingTopic(null);
      await loadTopicsForSelectedSubject();
      const updatedSubs = await getSubjects();
      setSubjects(updatedSubs);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update topic');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleQuickStatusToggle = async (topic: Topic) => {
    const nextStatus: TopicStatus =
      topic.status === 'not_started'
        ? 'in_progress'
        : topic.status === 'in_progress'
        ? 'completed'
        : 'not_started';

    try {
      await updateTopic(topic.id, { status: nextStatus });
      await loadTopicsForSelectedSubject();
      const updatedSubs = await getSubjects();
      setSubjects(updatedSubs);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTopic) return;
    setDeleteSubmitting(true);
    try {
      await deleteTopic(deletingTopic.id);
      setDeletingTopic(null);
      await loadTopicsForSelectedSubject();
      const updatedSubs = await getSubjects();
      setSubjects(updatedSubs);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete topic');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Derived stats
  const totalTopicsCount = topics.length;
  const completedTopicsCount = topics.filter((t) => t.status === 'completed').length;
  const inProgressTopicsCount = topics.filter((t) => t.status === 'in_progress').length;
  const notStartedTopicsCount = topics.filter((t) => t.status === 'not_started').length;
  const totalEstimatedMinutes = topics.reduce((acc, t) => acc + (t.estimated_duration_minutes || 0), 0);
  const progressPercentage =
    totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

  const filteredTopics = topics.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Syllabus & Topics</h2>
          <p className="mt-1 text-xs text-slate-400">
            Break down course material into study topics and monitor completion.
          </p>
        </div>

        {selectedSubjectId && (
          <button
            onClick={() => {
              setCreateForm({
                title: '',
                description: '',
                status: 'not_started',
                priority: 'medium',
                estimated_duration_minutes: 60,
              });
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm self-start sm:self-center"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Topic</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={loadTopicsForSelectedSubject} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Subject Selector Tabs */}
      {loadingSubjects ? (
        <div className="text-xs text-slate-400">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<LayersIcon className="w-8 h-8" />}
          title="No subjects available"
          description="Create a subject first before adding syllabus topics."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
            {subjects.map((sub) => {
              const active = sub.id === selectedSubjectId;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white border border-sky-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sub.color || '#3b82f6' }}
                  />
                  <span>{sub.name}</span>
                  <span className="text-[10px] text-slate-500 px-1.5 py-0.2 rounded-md bg-slate-800">
                    {sub.completed_topic_count}/{sub.topic_count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Subject Overview Card */}
          {currentSubject && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentSubject.color || '#3b82f6' }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{currentSubject.name}</h3>
                    {currentSubject.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{currentSubject.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <div className="text-right">
                    <span className="text-slate-400">Total Estimated: </span>
                    <span className="font-semibold text-slate-200">
                      {Math.round(totalEstimatedMinutes / 60)} hrs ({totalEstimatedMinutes} min)
                    </span>
                  </div>
                </div>
              </div>

              <ProgressBar
                progress={progressPercentage}
                color={currentSubject.color}
                showLabel={true}
                size="md"
              />

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-800/40">
                  <div className="text-slate-400">Total</div>
                  <div className="font-bold text-white mt-0.5">{totalTopicsCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/40">
                  <div className="text-slate-400">Completed</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{completedTopicsCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/40">
                  <div className="text-slate-400">In Progress</div>
                  <div className="font-bold text-amber-400 mt-0.5">{inProgressTopicsCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/40">
                  <div className="text-slate-400">Not Started</div>
                  <div className="font-bold text-slate-300 mt-0.5">{notStartedTopicsCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 mr-1">Filter:</span>
              {(['all', 'not_started', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'not_started'
                    ? 'Not Started'
                    : st === 'in_progress'
                    ? 'In Progress'
                    : 'Completed'}
                </button>
              ))}
            </div>

            <button
              onClick={loadTopicsForSelectedSubject}
              disabled={loadingTopics}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700 transition"
              title="Refresh topics"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loadingTopics ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Topic List */}
          {loadingTopics && topics.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading topics...</div>
          ) : filteredTopics.length === 0 ? (
            <EmptyState
              icon={<LayersIcon className="w-7 h-7" />}
              title={topics.length === 0 ? 'No topics created for this subject' : 'No matching topics'}
              description={
                topics.length === 0
                  ? 'Add individual topics, chapters, or syllabus modules.'
                  : 'Try changing the status filter above.'
              }
              actionLabel={topics.length === 0 ? 'Add First Topic' : undefined}
              onAction={topics.length === 0 ? () => setIsCreateOpen(true) : undefined}
            />
          ) : (
            <div className="divide-y divide-slate-800 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => handleQuickStatusToggle(topic)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                        topic.status === 'completed'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : topic.status === 'in_progress'
                          ? 'bg-amber-950/70 border-amber-600 text-amber-400'
                          : 'border-slate-600 hover:border-slate-400 text-transparent'
                      }`}
                      title="Click to cycle status"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-sm font-semibold tracking-tight ${
                            topic.status === 'completed'
                              ? 'text-slate-400 line-through'
                              : 'text-white'
                          }`}
                        >
                          {topic.title}
                        </span>
                      </div>
                      {topic.description && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{topic.description}</p>
                      )}
                      <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
                        <Badge type="status" value={topic.status} />
                        <Badge type="priority" value={topic.priority} />
                        <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                          <ClockIcon className="w-3 h-3" />
                          <span>{topic.estimated_duration_minutes} min</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEdit(topic)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Edit Topic"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingTopic(topic)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Delete Topic"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Topic Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={`Add Topic to ${currentSubject?.name || 'Subject'}`}
      >
        <form onSubmit={handleCreateTopic} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="e.g. Newton's Laws of Motion"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Key concepts, textbook references, or sub-topics"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as TopicStatus })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as TopicPriority })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Est. Duration (min)
              </label>
              <input
                type="number"
                min={1}
                required
                value={createForm.estimated_duration_minutes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
            >
              {createSubmitting ? 'Adding...' : 'Add Topic'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Topic Modal */}
      <Modal
        isOpen={editingTopic !== null}
        onClose={() => setEditingTopic(null)}
        title="Edit Topic"
      >
        <form onSubmit={handleEditTopic} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TopicStatus })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TopicPriority })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Est. Duration (min)
              </label>
              <input
                type="number"
                min={1}
                required
                value={editForm.estimated_duration_minutes}
                onChange={(e) =>
                  setEditForm({ ...editForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingTopic(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Topic Confirmation */}
      <ConfirmDialog
        isOpen={deletingTopic !== null}
        onClose={() => setDeletingTopic(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Topic"
        message={`Are you sure you want to delete topic "${deletingTopic?.title}"?`}
        confirmLabel="Delete Topic"
        loading={deleteSubmitting}
      />
    </div>
  );
};
