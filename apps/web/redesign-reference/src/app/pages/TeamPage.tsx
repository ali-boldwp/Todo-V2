import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { mockTeamMembers } from '../data/mockData';
import {
  UserPlus,
  MoreVertical,
  Shield,
  ShieldOff,
  KeyRound,
  Trash2,
  X,
  Eye,
  EyeOff,
  Users as UsersIcon,
  CheckCircle,
  Mail,
  Github,
} from 'lucide-react';

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  member: 'bg-slate-100 text-slate-700 border-slate-200',
};

// Simple avatar component
const UserAvatar = ({ firstName, lastName, email, sizeClassName = 'w-8 h-8' }: any) => {
  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : email
      ? email[0].toUpperCase()
      : 'U';

  return (
    <div
      className={`${sizeClassName} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0`}
    >
      {initials}
    </div>
  );
};

// Simple Switch component
const Switch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export function TeamPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [pwModal, setPwModal] = useState<{ isOpen: boolean; password?: string }>({ isOpen: false });
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [testerFilter, setTesterFilter] = useState<'all' | 'eligible'>('all');
  const [members, setMembers] = useState(mockTeamMembers);

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    githubUsername: '',
    canVerifyTasks: false,
    password: '',
    role: 'member' as 'manager' | 'member',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    // Mock create - in real app would call API
    console.log('Creating member:', form);
    setIsModalOpen(false);
  };

  const toggleMemberStatus = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isActive: !m.isActive } : m))
    );
    setMenuOpen(null);
  };

  const toggleCanVerify = (id: string, checked: boolean) => {
    setMembers((prev) =>
      prev.map((m) => (m._id === id ? { ...m, canVerifyTasks: checked } : m))
    );
  };

  const updateRole = (id: string, role: string) => {
    setMembers((prev) =>
      prev.map((m) => (m._id === id ? { ...m, role } : m))
    );
  };

  const resetPassword = (id: string) => {
    const newPassword = 'Temp' + Math.random().toString(36).substr(2, 8);
    setPwModal({ isOpen: true, password: newPassword });
    setMenuOpen(null);
  };

  const deleteMember = (id: string, name: string) => {
    if (window.confirm(`Delete ${name}?`)) {
      setMembers((prev) => prev.filter((m) => m._id !== id));
      setMenuOpen(null);
    }
  };

  const displayedMembers =
    testerFilter === 'eligible' ? members.filter((m: any) => !!m.canVerifyTasks) : members;

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span>Home</span>
              <span>›</span>
              <span className="text-slate-600 font-semibold">Team</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Team Management</h1>
            <p className="text-slate-600 mb-3">
              {displayedMembers.length} member{displayedMembers.length !== 1 ? 's' : ''}
              {testerFilter === 'eligible' && <span> (can test)</span>}
            </p>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTesterFilter('all')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition-all ${
                  testerFilter === 'all'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Members
              </button>
              <button
                onClick={() => setTesterFilter('eligible')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition-all ${
                  testerFilter === 'eligible'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Can Test
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              setFormError('');
              setForm({
                firstName: '',
                lastName: '',
                email: '',
                githubUsername: '',
                canVerifyTasks: false,
                password: '',
                role: 'member',
              });
            }}
            className="h-11 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-5 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-1">Total Members</p>
                <p className="text-3xl font-bold text-slate-900">{members.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-1">Active</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {members.filter((m) => m.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-1">Can Test</p>
                <p className="text-3xl font-bold text-violet-700">
                  {members.filter((m) => m.canVerifyTasks).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Member Table */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-gray-50">
                <th className="px-6 py-4 text-left">Member</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Can Test</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedMembers.map((m: any) => (
                <tr key={m._id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      onClick={() => navigate(`/team/${m._id}`)}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      <UserAvatar
                        firstName={m.firstName}
                        lastName={m.lastName}
                        email={m.email}
                        sizeClassName="w-10 h-10"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {m.role === 'admin' ? (
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[m.role]}`}
                      >
                        {m.role}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m._id, e.target.value)}
                        className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full border-2 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${ROLE_STYLES[m.role]}`}
                      >
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {m.role === 'admin' ? (
                      <span className="text-xs font-semibold text-slate-400">N/A</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!m.canVerifyTasks}
                          onChange={(checked) => toggleCanVerify(m._id, checked)}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            m.canVerifyTasks ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {m.canVerifyTasks ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border-2 ${
                        m.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${m.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {m.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {m.role !== 'admin' && (
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMenuOpen(menuOpen === m._id ? null : m._id)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen === m._id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-2xl border-2 border-slate-200 py-2 z-20">
                            <button
                              onClick={() => toggleMemberStatus(m._id)}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 font-medium ${
                                m.isActive ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              {m.isActive ? (
                                <ShieldOff className="w-4 h-4" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                              {m.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => resetPassword(m._id)}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 flex items-center gap-2 hover:bg-slate-50 font-medium"
                            >
                              <KeyRound className="w-4 h-4" />
                              Reset Password
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={() => deleteMember(m._id, `${m.firstName} ${m.lastName}`)}
                              className="w-full text-left px-4 py-2.5 text-sm text-rose-600 flex items-center gap-2 hover:bg-rose-50 font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Member
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invite Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border-2 border-slate-200">
              <div className="flex items-center justify-between p-6 border-b-2 border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Invite Team Member</h2>
                  <p className="text-sm text-slate-500 mt-1">Create a new account for your team</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    GitHub Username (optional)
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      name="githubUsername"
                      value={form.githubUsername}
                      onChange={handleFormChange}
                      placeholder="e.g. octocat"
                      className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-2.5 pr-10 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <Switch
                    checked={form.canVerifyTasks}
                    onChange={(checked) => setForm((f) => ({ ...f, canVerifyTasks: checked }))}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Can test/verify finished tasks
                  </span>
                </div>
                {formError && <p className="text-sm text-rose-600 font-medium">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {pwModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border-2 border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset</h2>
              <p className="text-sm text-slate-600 mb-6">Share this new password with the team member:</p>
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between mb-6">
                <span className="font-mono text-base font-bold text-slate-900">{pwModal.password}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(pwModal.password || '')}
                  className="text-indigo-600 text-sm font-bold hover:text-indigo-700 px-3 py-1 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setPwModal({ isOpen: false })}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close menus */}
        {menuOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
        )}
      </div>
    </div>
  );
}