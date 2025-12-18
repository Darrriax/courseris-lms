import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, CheckCircle, Clock, User, ChevronDown } from 'lucide-react';
import { learningApi } from '../api/axios';
import { ManagerMessage } from '../types';

type FilterStatus = 'all' | 'open' | 'answered';

export const ManagerMessages: React.FC = () => {
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedMessage, setSelectedMessage] = useState<ManagerMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const resp = await learningApi.get('/manager/messages');
      setMessages(resp.data || []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setSending(true);
    try {
      await learningApi.post(`/manager/messages/${selectedMessage.id}/reply`, {
        reply: replyText,
      });
      setReplyText('');
      setSelectedMessage(null);
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send reply', err);
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const openCount = messages.filter((m) => m.status === 'open').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Teacher Messages</h1>
          <p className="text-slate-500 mt-1">
            Messages from teachers requiring your attention.
            {openCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {openCount} unanswered
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterStatus)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Messages</option>
            <option value="open">Unanswered</option>
            <option value="answered">Answered</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading messages...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No messages found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  setSelectedMessage(msg);
                  setReplyText('');
                }}
                className={`bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${
                  selectedMessage?.id === msg.id
                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{msg.teacher_name || 'Teacher'}</p>
                      <p className="text-xs text-slate-500">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      msg.status === 'open'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {msg.status === 'open' ? (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Awaiting Reply
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Answered
                      </>
                    )}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{msg.subject}</h3>
                <p className="text-slate-600 text-sm line-clamp-2">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Message Detail & Reply */}
          <div className="lg:sticky lg:top-6 h-fit">
            {selectedMessage ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">{selectedMessage.subject}</h3>
                  <p className="text-sm text-slate-500">
                    From: {selectedMessage.teacher_name || 'Teacher'}
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                    <p className="text-xs text-slate-400 mt-3">
                      {selectedMessage.created_at
                        ? new Date(selectedMessage.created_at).toLocaleString()
                        : ''}
                    </p>
                  </div>

                  {selectedMessage.reply && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                      <p className="text-xs text-indigo-600 font-medium mb-2">Your Reply</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.reply}</p>
                      <p className="text-xs text-slate-400 mt-3">
                        {selectedMessage.replied_at
                          ? new Date(selectedMessage.replied_at).toLocaleString()
                          : ''}
                      </p>
                    </div>
                  )}

                  {selectedMessage.status === 'open' && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">Your Reply</label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 resize-none"
                        placeholder="Write your reply..."
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleReply}
                          disabled={sending || !replyText.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          {sending ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

