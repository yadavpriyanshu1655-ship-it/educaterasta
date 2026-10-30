import React, { useState, useEffect } from 'react';
import { Subject, Exam, ExamCreateInput, ExamUpdateInput } from '../types';
import { getSubjects, getExams, createExam, updateExam, deleteExam } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import {
  AwardIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../components/Icons';

interface ExamsPageProps {
  openCreateModal?: boolean;
  onResetOpenCreateModal?: () => void;
}

export const ExamsPage: React.FC<ExamsPageProps> = ({
  openCreateModal = false,
  onResetOpenCreateModal,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ExamCreateInput>({
    subject_id: 0,
    title: '',
    exam_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editForm, setEditForm] = useState<ExamUpdateInput>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Dialog
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsData, subjectsData] = await Promise.all([getExams(), getSubjects()]);
      setExams(examsData);
      setSubjects(subjectsData);
      if (subjectsData.length > 0 && createForm.subject_id === 0) {
        setCreateForm((prev) => ({ ...prev, subject_id: subjectsData[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (openCreateModal) {
      setIsCreateOpen(true);
      if (onResetOpenCreateModal) onResetOpenCreateModal();
    }
  }, [openCreateModal, onResetOpenCreateModal]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError('Exam title is required');
      return;
    }
    if (!createForm.subject_id) {
      setCreateError('Please select a subject');
      return;
    }
    if (!createForm.exam_date) {
      setCreateError('Examination date is required');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createExam({
        subject_id: createForm.subject_id,
        title: createForm.title.trim(),
        exam_date: createForm.exam_date,
        notes: createForm.notes?.trim() || undefined,
      });
      setIsCreateOpen(false);
      setCreateForm({
        subject_id: subjects[0]?.id || 0,
        title: '',
        exam_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      const data = await getExams();
      setExams(data);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create examination');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setEditForm({
      subject_id: exam.subject_id,
      title: exam.title,
      exam_date: exam.exam_date,
      notes: exam.notes || '',
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;
    if (!editForm.title?.trim()) {
      setEditError('Exam title is required');
      return;
    }
    if (!editForm.exam_date) {
      setEditError('Examination date is required');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateExam(editingExam.id, {
        subject_id: editForm.subject_id,
        title: editForm.title.trim(),
        exam_date: editForm.exam_date,
        notes: editForm.notes?.trim() || undefined,
      });
      setEditingExam(null);
      const data = await getExams();
      setExams(data);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update examination');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExam) return;
    setDeleteSubmitting(true);
    try {
      await deleteExam(deletingExam.id);
      setDeletingExam(null);
      const data = await getExams();
      setExams(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete exam');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Examinations</h2>
          <p className="mt-1 text-xs text-slate-400">
            Track midterm, final, and test dates with automatic countdowns.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setCreateForm({
                subject_id: subjects[0]?.id || 0,
                title: '',
                exam_date: new Date().toISOString().split('T')[0],
                notes: '',
              });
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            disabled={subjects.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm disabled:opacity-50"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Exam</span>
          </button>
          <button
            onClick={fetchInitialData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
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
          <button onClick={fetchInitialData} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {loading && exams.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="inline-block animate-spin text-sky-400">
            <RefreshIcon className="w-6 h-6" />
          </div>
          <p className="text-xs">Loading examinations...</p>
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<AwardIcon className="w-8 h-8" />}
          title="No exams scheduled"
          description="Register your upcoming tests, midterms, or finals to plan your study sessions around target milestones."
          actionLabel={subjects.length > 0 ? 'Add First Exam' : undefined}
          onAction={subjects.length > 0 ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: exam.subject_color || '#3b82f6' }}
                    />
                    <span className="text-xs font-semibold text-slate-300">{exam.subject_name}</span>
                  </div>

                  {exam.is_today ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Today!
                    </span>
                  ) : exam.is_past ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                      Past
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-950/70 text-sky-300 border border-sky-800">
                      {exam.days_remaining} {exam.days_remaining === 1 ? 'day' : 'days'} left
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-base font-bold text-white tracking-tight">{exam.title}</h3>

                <div className="mt-2 flex items-center space-x-1.5 text-xs text-slate-400">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{exam.exam_date}</span>
                </div>

                {exam.notes && (
                  <p className="mt-3 text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                    {exam.notes}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end space-x-1.5">
                <button
                  onClick={() => handleOpenEdit(exam)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Edit Exam"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingExam(exam)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Delete Exam"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Examination"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={createForm.subject_id}
              onChange={(e) => setCreateForm({ ...createForm, subject_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Exam Title *
            </label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="e.g. Midterm Examination, Unit Test 2"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Exam Date *
            </label>
            <input
              type="date"
              required
              value={createForm.exam_date}
              onChange={(e) => setCreateForm({ ...createForm, exam_date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={createForm.notes || ''}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="Exam room, chapters covered, grading weight"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
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
              {createSubmitting ? 'Saving...' : 'Save Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Exam Modal */}
      <Modal
        isOpen={editingExam !== null}
        onClose={() => setEditingExam(null)}
        title="Edit Examination"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={editForm.subject_id || ''}
              onChange={(e) => setEditForm({ ...editForm, subject_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Exam Title *
            </label>
            <input
              type="text"
              required
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Exam Date *
            </label>
            <input
              type="date"
              required
              value={editForm.exam_date || ''}
              onChange={(e) => setEditForm({ ...editForm, exam_date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingExam(null)}
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

      {/* Delete Exam Confirmation */}
      <ConfirmDialog
        isOpen={deletingExam !== null}
        onClose={() => setDeletingExam(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Examination"
        message={`Are you sure you want to delete exam "${deletingExam?.title}"?`}
        confirmLabel="Delete Exam"
        loading={deleteSubmitting}
      />
    </div>
  );
};

