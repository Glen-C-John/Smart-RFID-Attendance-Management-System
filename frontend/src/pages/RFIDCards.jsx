import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cardService } from '../services/cardService';
import { studentService } from '../services/studentService';

export const RFIDCards = () => {
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Register Modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [cardUid, setCardUid] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [storedTagData, setStoredTagData] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cardService.getCards({ status: statusFilter, limit: 50 });
      setCards(res.cards || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleOpenRegister = async () => {
    setCardUid('');
    setSelectedStudentId('');
    setStoredTagData('');
    setFormError('');
    setIsRegisterModalOpen(true);

    try {
      const res = await studentService.getStudents({ limit: 100, status: 'active' });
      setStudentsList(res.students || []);
      if (res.students?.length > 0) {
        setSelectedStudentId(res.students[0].studentId);
      }
    } catch (e) {
      console.error('Failed to load students for assignment:', e);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await cardService.registerCard({
        cardUid,
        studentId: selectedStudentId,
        storedTagData,
      });
      setIsRegisterModalOpen(false);
      fetchCards();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (card) => {
    try {
      if (card.status === 'active') {
        if (!confirm(`Are you sure you want to block card ${card.cardUid}? It will be rejected by scanners immediately.`)) return;
        await cardService.blockCard(card.cardUid);
      } else {
        await cardService.activateCard(card.cardUid);
      }
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update card status');
    }
  };

  const filteredCards = cards.filter((c) => {
    const matchSearch =
      c.cardUid.toLowerCase().includes(search.toLowerCase()) ||
      c.studentId.toLowerCase().includes(search.toLowerCase()) ||
      (c.storedTagData && c.storedTagData.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const activeCount = cards.filter((c) => c.status === 'active').length;
  const blockedCount = cards.filter((c) => c.status === 'blocked').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            RFID Card Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Hardware MFRC522 credentials & tag assignments
          </p>
        </div>

        <button
          onClick={handleOpenRegister}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register / Replace Card</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Registered Cards</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{total}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Cards</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Blocked Cards</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{blockedCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Card UID, Student ID, or Tag Name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none w-full md:w-auto"
        >
          <option value="">All Card Statuses</option>
          <option value="active">Active Only</option>
          <option value="blocked">Blocked Only</option>
        </select>
      </div>

      {/* Cards Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Card UID</th>
                <th className="px-4 py-3.5">Assigned Student</th>
                <th className="px-4 py-3.5">Legacy Tag Data (Block 2)</th>
                <th className="px-4 py-3.5">Registered On</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading RFID cards...</span>
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No RFID cards found.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card) => (
                  <tr key={card._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {card.cardUid}
                    </td>
                    <td className="px-4 py-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {card.studentId}
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {card.storedTagData ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                          "{card.storedTagData}"
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-[11px]">
                      {new Date(card.registeredAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          card.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                        }`}
                      >
                        {card.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(card)}
                        className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-colors ${
                          card.status === 'active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        {card.status === 'active' ? 'Block Card' : 'Activate Card'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register / Replace Card Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Assign / Register RFID Card</h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Card UID (Hex Format) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A1:B2:C3:D4 or A1B2C3D4"
                  value={cardUid}
                  onChange={(e) => setCardUid(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Colons or spaces will be automatically normalized.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Student *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {studentsList.map((s) => (
                    <option key={s._id} value={s.studentId}>
                      {s.studentId} — {s.name} ({s.className})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stored Tag Data (Optional Legacy Text)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mani"
                  value={storedTagData}
                  onChange={(e) => setStoredTagData(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">Preserves existing physical tag Block 2 contents.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Assign Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

