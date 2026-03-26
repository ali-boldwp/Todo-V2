import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Clock,
  Calendar,
  Timer,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface TimeEntry {
  _id: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export function TimePage() {
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([
    {
      _id: '1',
      description: 'Working on authentication',
      startTime: new Date(Date.now() - 7200000).toISOString(),
      endTime: new Date(Date.now() - 3600000).toISOString(),
      duration: 60,
    },
    {
      _id: '2',
      description: 'Code review and bug fixes',
      startTime: new Date(Date.now() - 14400000).toISOString(),
      endTime: new Date(Date.now() - 10800000).toISOString(),
      duration: 60,
    },
    {
      _id: '3',
      description: 'Team standup meeting',
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 85500000).toISOString(),
      duration: 15,
    },
  ]);

  const runningEntry = entries.find((e) => !e.endTime);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (runningEntry) {
      const interval = setInterval(() => {
        const start = new Date(runningEntry.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningEntry]);

  const startTimer = () => {
    const newEntry: TimeEntry = {
      _id: Date.now().toString(),
      description: description.trim() || 'Working on task',
      startTime: new Date().toISOString(),
    };
    setEntries([newEntry, ...entries]);
    setDescription('');
  };

  const stopTimer = () => {
    if (!runningEntry) return;
    const duration = Math.floor((Date.now() - new Date(runningEntry.startTime).getTime()) / 60000);
    setEntries((prev) =>
      prev.map((e) =>
        e._id === runningEntry._id
          ? { ...e, endTime: new Date().toISOString(), duration }
          : e
      )
    );
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const completedEntries = entries.filter((e) => e.endTime);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const todayMinutes = completedEntries
    .filter((e) => {
      const entryDate = new Date(e.startTime);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    })
    .reduce((sum, e) => sum + (e.duration || 0), 0);

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Home</span>
            <span>›</span>
            <span className="text-slate-600 font-semibold">Time Tracking</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Time Tracking</h1>
          <p className="text-slate-600">Track your work hours and productivity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-700 font-bold mb-1">Today</p>
                <p className="text-3xl font-bold text-indigo-900">{formatDuration(todayMinutes)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-bold mb-1">Total Time</p>
                <p className="text-3xl font-bold text-emerald-900">{formatDuration(totalMinutes)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-700 font-bold mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-amber-900">{completedEntries.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Timer Control */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Timer</h2>
              <p className="text-sm text-slate-500">Track your work sessions</p>
            </div>
          </div>

          {runningEntry ? (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Running...</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 mb-2">
                    {runningEntry.description || 'No description'}
                  </p>
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Started at {new Date(runningEntry.startTime).toLocaleTimeString()}
                  </p>
                  <div className="mt-4">
                    <p className="text-4xl font-bold text-emerald-900 font-mono">
                      {formatElapsed(elapsedSeconds)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={stopTimer}
                  className="h-14 px-8 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Square className="w-5 h-5" fill="currentColor" />
                  Stop Timer
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <input
                  className="flex-1 px-4 py-3 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="What are you working on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startTimer();
                  }}
                />
                <button
                  onClick={startTimer}
                  className="h-12 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  Start Timer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Time Entries Table */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">Time Entries</h2>
            </div>
          </div>

          {completedEntries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No time entries yet</p>
              <p className="text-sm text-slate-400 mt-1">Start tracking your time to see entries here</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-left">Description</th>
                  <th className="px-6 py-4 text-left">Start</th>
                  <th className="px-6 py-4 text-left">End</th>
                  <th className="px-6 py-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-slate-600 font-medium">
                        {new Date(entry.startTime).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-900 font-medium">{entry.description || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {new Date(entry.startTime).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">
                        {entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border-2 border-indigo-200">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.duration || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
