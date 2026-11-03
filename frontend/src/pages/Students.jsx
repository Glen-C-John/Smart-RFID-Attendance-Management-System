import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  X,
  AlertTriangle,
  Loader2,
  Filter,
} from 'lucide-react';
import { studentService } from '../services';

export const Students = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    className: '',
    department: '',
    status: 'active',
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentService.getStudents({
        page,
        limit: 15,
        search,
        className: classFilter,
        status: statusFilter,
      });
      setStudents(res.students || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAdd = () => {
    setFormData({
      studentId: '',
      name: '',
      email: '',
      phone: '',
      className: '',
      department: '',
      status: 'active',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      studentId: student.studentId,
      name: student.name,
      email: student.email || '',
      phone: student.phone || '',
      className: student.className,
      department: student.department || '',
      status: student.status,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await studentService.createStudent(formData);
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await studentService.updateStudent(selectedStudent.studentId, formData);
      setIsEditModalOpen(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (force = false) => {
    setIsSubmitting(true);
    try {
      await studentService.deleteStudent(selectedStudent.studentId, force);
      setIsDeleteModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Student Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Total {total} students registered in the system
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Classes</option>
            <option value="CSE-A">CSE-A</option>
            <option value="CSE-B">CSE-B</option>
            <option value="CSE-1">CSE-1</option>
            <option value="ECE-1">ECE-1</option>
            <option value="ECE-2">ECE-2</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-4 py-3.5">Name</th>
                <th className="px-4 py-3.5">Class & Dept</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading student records...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {student.studentId}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{student.name}</div>
                      <div className="text-[11px] text-slate-400">{student.email || 'No email provided'}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{student.className}</span>
                      {student.department && (
                        <span className="text-slate-400 block text-[11px]">{student.department}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {student.phone || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          student.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-1">
                      <Link
                        to={`/students/${student.studentId}`}
                        className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View profile & attendance history"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit student"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Deactivate or delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Register New Student</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU101"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mani Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Section *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE-A"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="student@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Edit Student ({selectedStudent?.studentId})
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <div className="flex items-center space-x-3 text-rose-500 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Deactivate Student?</h3>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to deactivate <span className="font-semibold text-slate-900 dark:text-white">{selectedStudent?.name}</span> ({selectedStudent?.studentId})?
            </p>
            <p className="mt-2 text-slate-400 text-[11px]">
              Deactivation will block their assigned RFID cards and prevent new attendance scans, while safely preserving all historical attendance records in the database.
            </p>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteConfirm(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Deactivate Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

