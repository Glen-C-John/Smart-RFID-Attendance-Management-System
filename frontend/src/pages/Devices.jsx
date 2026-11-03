import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Plus,
  Wifi,
  WifiOff,
  Edit2,
  X,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
} from 'lucide-react';
import { deviceService } from '../services';

export const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    location: '',
    apiKey: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDevices = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await deviceService.getDevices();
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    // Poll device health every 15s
    const interval = setInterval(() => fetchDevices(true), 15000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const handleOpenRegister = () => {
    setFormData({
      deviceId: '',
      deviceName: '',
      location: 'Main Gate',
      apiKey: '',
    });
    setFormError('');
    setIsRegisterModalOpen(true);
  };

  const handleOpenEdit = (device) => {
    setSelectedDevice(device);
    setFormData({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      location: device.location,
      status: device.status,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await deviceService.registerDevice(formData);
      setIsRegisterModalOpen(false);
      fetchDevices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register device');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await deviceService.updateDevice(selectedDevice.deviceId, formData);
      setIsEditModalOpen(false);
      fetchDevices();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update device');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            IoT Scanner Nodes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            ESP8266 + MFRC522 hardware attendance points
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDevices()}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Refresh connectivity status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button
            onClick={handleOpenRegister}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Scanner</span>
          </button>
        </div>
      </div>

      {/* Connectivity Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Registered Nodes</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{devices.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Nodes Online (Active Stream)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{onlineCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Offline / Unreachable</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{offlineCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <WifiOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Devices Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Device ID & Name</th>
                <th className="px-4 py-3.5">Physical Location</th>
                <th className="px-4 py-3.5">Connection State</th>
                <th className="px-4 py-3.5">Last Communication</th>
                <th className="px-4 py-3.5">Firmware</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading device statuses...</span>
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No hardware scanners registered yet.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{device.deviceName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">{device.deviceId}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                      <span className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{device.location || 'Main Entrance'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {device.isOnline ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <span>Offline</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-[11px]">
                      {device.lastSeen ? (
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(device.lastSeen).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric', hour12: true })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Never connected</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      v{device.firmwareVersion || '1.0.0'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(device)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit node details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Scanner Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Provision New Scanner</h3>
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
                  Device ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP8266_002"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Must match DEVICE_ID in your NodeMCU firmware.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Library Entrance Scanner"
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate, Lab 102"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Device API Key (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate random secret key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
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
                  {isSubmitting ? 'Provisioning...' : 'Provision Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Edit Scanner ({selectedDevice?.deviceId})
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Device Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="revoked">Revoked</option>
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
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

