import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Send,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  Smartphone,
} from 'lucide-react';
import { getStoredToken } from '../../services/api';

/**
 * Collections by Chandni - Admin Notification Management & Outbox Audit
 *
 * Implements Step 26:
 * - Real-time provider health & configuration inspection
 * - Delivery status metrics (Sent, Delivered, Failed, Skipped)
 * - Filterable notification audit trail
 * - Manual notification retry with immediate UI update
 * - Inspection modal for payload metadata & provider references
 */
export default function NotificationLogSection() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspection Modal
  const [inspectItem, setInspectItem] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/admin/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.warn('Could not fetch notification stats:', e.message);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 15);
      if (channelFilter) params.append('channel', channelFilter);
      if (eventFilter) params.append('event', eventFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (e) {
      console.warn('Could not fetch notification logs:', e.message);
    } finally {
      setLoading(false);
    }
  }, [page, channelFilter, eventFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (item) => {
    setRetryingId(item.id);
    setFeedback(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/notifications/${item.id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Notification retried successfully (Status: ${data.notification?.status})`,
        });
        fetchLogs();
        fetchStats();
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Retry failed',
        });
      }
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Retry request failed' });
    } finally {
      setRetryingId(null);
    }
  };

  const getEventBadge = (event) => {
    switch (event) {
      case 'ORDER_CONFIRMED':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xs">Order Confirmed</span>;
      case 'PAYMENT_CONFIRMED':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200 rounded-xs">Payment Confirmed</span>;
      case 'ORDER_DISPATCHED':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200 rounded-xs">Order Dispatched</span>;
      case 'ORDER_CANCELLED':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-800 border border-stone-300 rounded-xs">Order Cancelled</span>;
      case 'REFUND_PROCESSED':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-xs">Refund Processed</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-stone-50 text-stone-700 border border-stone-200 rounded-xs">{event}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-900 rounded-full">
            <CheckCircle2 size={11} className="text-emerald-700" />
            {status}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-900 rounded-full">
            <AlertCircle size={11} className="text-rose-700" />
            FAILED
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 rounded-full">
            <Clock size={11} className="text-amber-700" />
            OPTED OUT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-800 rounded-full">
            {status}
          </span>
        );
    }
  };

  const config = stats?.sanitizedConfig;

  return (
    <div className="space-y-6">
      {/* Provider Health & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Provider Card */}
        <div className="p-4 bg-white border border-stone-200 rounded-xs shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-[#781D42] rounded-xs">
                <Mail size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Email Channel
                </h4>
                <p className="text-[11px] text-stone-500">
                  {config?.email?.provider || 'RESEND / SMTP / DRY_RUN'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded-full ${
                config?.email?.isConfigured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {config?.email?.mode || 'DRY_RUN (Simulated)'}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-1 text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">Sender Address:</span>
              <span className="font-mono text-stone-800 truncate max-w-[200px]">
                {config?.email?.from || 'orders@collectionsbychandni.in'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Environment:</span>
              <span className="font-semibold text-stone-700 uppercase">
                {config?.environment || 'development'}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Provider Card (MSG91) */}
        <div className="p-4 bg-white border border-stone-200 rounded-xs shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xs">
                <MessageSquare size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  WhatsApp Channel (MSG91)
                </h4>
                <p className="text-[11px] text-stone-500">Official Outbound Template API</p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded-full ${
                config?.whatsapp?.isConfigured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {config?.whatsapp?.mode || 'DRY_RUN (Simulated)'}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-1 text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">Integrated Phone:</span>
              <span className="font-mono text-stone-800">{config?.whatsapp?.integratedNumber || 'Configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Transactional Templates:</span>
              <span className="font-semibold text-emerald-700">5 Registered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Counter Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Total Logged</div>
            <div className="text-xl font-bold font-serif text-stone-900 mt-0.5">{stats.total || 0}</div>
          </div>
          <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">Sent / Delivered</div>
            <div className="text-xl font-bold font-serif text-emerald-900 mt-0.5">{stats.sent || 0}</div>
          </div>
          <div className="p-3 bg-rose-50/50 border border-rose-200/60 rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold">Failed Dispatches</div>
            <div className="text-xl font-bold font-serif text-rose-900 mt-0.5">{stats.failed || 0}</div>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xs">
            <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Customer Opted Out</div>
            <div className="text-xl font-bold font-serif text-amber-900 mt-0.5">{stats.skipped || 0}</div>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 text-xs rounded-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white border border-stone-200 rounded-xs p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search recipient, order ID, or subject..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-8 pr-3 py-2 border border-stone-300 rounded-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#781D42]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-2 border border-stone-300 rounded-xs bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#781D42]"
            >
              <option value="">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>

            {/* Event filter */}
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-2 border border-stone-300 rounded-xs bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#781D42]"
            >
              <option value="">All Events</option>
              <option value="ORDER_CONFIRMED">Order Confirmed</option>
              <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
              <option value="ORDER_DISPATCHED">Order Dispatched</option>
              <option value="ORDER_CANCELLED">Order Cancelled</option>
              <option value="REFUND_PROCESSED">Refund Processed</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-2 border border-stone-300 rounded-xs bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#781D42]"
            >
              <option value="">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped (Opt-out)</option>
            </select>

            <button
              type="button"
              onClick={() => {
                fetchLogs();
                fetchStats();
              }}
              className="px-3 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xs text-xs flex items-center gap-1.5"
              title="Refresh Logs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white border border-stone-200 rounded-xs shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {loading && notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-stone-400" />
                    Loading notification logs...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No notification logs match your active filters.
                  </td>
                </tr>
              ) : (
                notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {item.channel === 'EMAIL' ? (
                          <Mail size={13} className="text-[#781D42]" />
                        ) : (
                          <MessageSquare size={13} className="text-emerald-700" />
                        )}
                        <span className="font-semibold text-stone-800">{item.channel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getEventBadge(item.event)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-700 max-w-[180px] truncate">
                      {item.recipient}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                      {item.orderId ? item.orderId.slice(0, 16) : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => setInspectItem(item)}
                        className="text-stone-500 hover:text-stone-900 px-2 py-1 border border-stone-200 rounded-xs text-[11px]"
                      >
                        Inspect
                      </button>
                      {(item.status === 'FAILED' || item.status === 'SKIPPED') && (
                        <button
                          type="button"
                          disabled={retryingId === item.id}
                          onClick={() => handleRetry(item)}
                          className="text-[#781D42] hover:bg-rose-50 px-2 py-1 border border-rose-200 rounded-xs text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <RefreshCw size={11} className={retryingId === item.id ? 'animate-spin' : ''} />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-stone-200 rounded-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-stone-200 rounded-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Item Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-xs shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-base text-stone-900">
                  Notification Audit Detail
                </span>
                {getStatusBadge(inspectItem.status)}
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xs border border-stone-100 font-mono text-[11px]">
                <div>
                  <span className="text-stone-400 block text-[10px]">EVENT</span>
                  <span className="font-semibold">{inspectItem.event}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">CHANNEL</span>
                  <span className="font-semibold">{inspectItem.channel}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">PROVIDER</span>
                  <span className="font-semibold">{inspectItem.provider}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">PROVIDER REF</span>
                  <span className="truncate block">{inspectItem.providerRef || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
                  Recipient
                </label>
                <div className="p-2 bg-stone-50 rounded-xs font-mono text-[11px] border border-stone-200">
                  {inspectItem.recipient}
                </div>
              </div>

              {inspectItem.subject && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
                    Subject Line
                  </label>
                  <div className="p-2 bg-stone-50 rounded-xs text-[11px] border border-stone-200">
                    {inspectItem.subject}
                  </div>
                </div>
              )}

              {inspectItem.errorMessage && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block mb-1">
                    Error Log / Reason
                  </label>
                  <div className="p-2.5 bg-rose-50 rounded-xs text-rose-900 border border-rose-200 font-mono text-[11px]">
                    {inspectItem.errorMessage}
                  </div>
                </div>
              )}

              {inspectItem.metadata && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
                    Payload Metadata
                  </label>
                  <pre className="p-2 bg-stone-50 rounded-xs text-[10px] font-mono border border-stone-200 overflow-x-auto max-h-40">
                    {JSON.stringify(inspectItem.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-[11px] text-stone-400 pt-2 border-t border-stone-100 flex justify-between">
                <span>Created: {new Date(inspectItem.createdAt).toLocaleString('en-IN')}</span>
                <span>Attempts: {inspectItem.attempts || 1}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xs text-xs font-medium"
              >
                Close
              </button>
              {(inspectItem.status === 'FAILED' || inspectItem.status === 'SKIPPED') && (
                <button
                  type="button"
                  disabled={retryingId === inspectItem.id}
                  onClick={() => {
                    handleRetry(inspectItem);
                    setInspectItem(null);
                  }}
                  className="px-4 py-2 bg-[#781D42] text-white hover:bg-[#5B1123] rounded-xs text-xs font-semibold"
                >
                  Retry Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
