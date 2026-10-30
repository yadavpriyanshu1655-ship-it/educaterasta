import React, { useState, useEffect } from 'react';
import { Subject, SubjectCreateInput, SubjectUpdateInput } from '../types';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import {
  BookOpenIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  LayersIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../components/Icons';

interface SubjectsPageProps {
  onSelectSubjectForTopics?: (subjectId: number) => void;
  openCreateModal?: boolean;
  onResetOpenCreateModal?: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const SubjectsPage: React.FC<SubjectsPageProps> = ({
  onSelectSubjectForTopics,
  openCreateModal = false,
  onResetOpenCreateModal,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SubjectCreateInput>({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editForm, setEditForm] = useState<SubjectUpdateInput>({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Dialog state
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchSubjectsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectsList();
  }, []);

  useEffect(() => {
    if (openCreateModal) {
      setIsCreateOpen(true);
      if (onResetOpenCreateModal) onResetOpenCreateModal();
    }
  }, [openCreateModal, onResetOpenCreateModal]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Subject name is required');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createSubject({
        name: createForm.name.trim(),
        description: createForm.description?.trim() || undefined,
        color: createForm.color,
      });
      setIsCreateOpen(false);
      setCreateForm({ name: '', description: '', color: '#3b82f6' });
      await fetchSubjectsList();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error creating subject');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditForm({
      name: subject.name,
      description: subject.description || '',
      color: subject.color || '#3b82f6',
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    if (!editForm.name?.trim()) {
      setEditError('Subject name is required');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateSubject(editingSubject.id, {
        name: editForm.name.trim(),
        description: editForm.description?.trim() || undefined,
        color: editForm.color,
      });
      setEditingSubject(null);
      await fetchSubjectsList();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error updating subject');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return;
    setDeleteSubmitting(true);
    try {
      await deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
      await fetchSubjectsList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete subject');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Subjects</h2>
          <p className="mt-1 text-xs text-slate-400">
            Organize syllabus topics and track completion by subject.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setCreateForm({ name: '', description: '', color: '#3b82f6' });
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
          <button
            onClick={fetchSubjectsList}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={fetchSubjectsList} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {loading && subjects.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin text-sky-400">
            <RefreshIcon className="w-6 h-6" />
          </div>
          <p className="text-xs">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpenIcon className="w-8 h-8" />}
          title="No subjects created yet"
          description="Create your first subject (e.g. Mathematics, Organic Chemistry, or World History) to begin tracking your syllabus."
          actionLabel="Add First Subject"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.color || '#3b82f6' }}
                    />
                    <h3 className="text-base font-bold text-white tracking-tight">{sub.name}</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Edit Subject"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingSubject(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Delete Subject"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sub.description && (
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400">Topics</span>
                    <span className="text-slate-300 font-semibold">
                      {sub.completed_topic_count} / {sub.topic_count} completed
                    </span>
                  </div>
                  <ProgressBar
                    progress={sub.progress_percentage}
                    color={sub.color}
                    showLabel={false}
                    size="sm"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {sub.progress_percentage}% completed
                </span>
                {onSelectSubjectForTopics && (
                  <button
                    onClick={() => onSelectSubjectForTopics(sub.id)}
                    className="inline-flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                  >
                    <LayersIcon className="w-3.5 h-3.5" />
                    <span>View Syllabus &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Subject"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {createError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Mathematics, Organic Chemistry"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Key focus areas, syllabus scope, or goals"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Color Identifier
            </label>
            <div className="flex items-center space-x-2">
              {PRESET_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setCreateForm({ ...createForm, color })}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    createForm.color === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
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
              {createSubmitting ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal
        isOpen={editingSubject !== null}
        onClose={() => setEditingSubject(null)}
        title="Edit Subject"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Color Identifier
            </label>
            <div className="flex items-center space-x-2">
              {PRESET_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setEditForm({ ...editForm, color })}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    editForm.color === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingSubject(null)}
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

      {/* Delete Subject Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingSubject !== null}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deletingSubject?.name}"? All associated syllabus topics, study sessions, and exams will also be permanently deleted.`}
        confirmLabel="Delete Subject"
        loading={deleteSubmitting}
      />
    </div>
  );
};

