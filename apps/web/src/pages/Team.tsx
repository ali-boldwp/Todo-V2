import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetTeamMemberPassword,
} from '../services/team';
import {
    UserPlus, MoreVertical, Shield, ShieldOff, KeyRound, Trash2, X, Eye, EyeOff,
} from 'lucide-react';
import Switch from '../components/Switch';

const ROLE_STYLES: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-700',
};

const initials = (m: any) =>
    `${m.firstName?.[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase();

const avatarColor = (id: string) => {
    const colors = [
        'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
        'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    ];
    return colors[id.charCodeAt(id.length - 1) % colors.length];
};

const Team = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [pwModal, setPwModal] = useState<{ isOpen: boolean; password?: string }>({ isOpen: false });
    const [showPw, setShowPw] = useState(false);
    const [formError, setFormError] = useState('');
    const [testerFilter, setTesterFilter] = useState<'all' | 'eligible'>('all');

    const { data: members = [], isLoading } = useQuery({
        queryKey: ['team-members'],
        queryFn: getTeamMembers,
    });

    const createMutation = useMutation({
        mutationFn: createTeamMember,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            setIsModalOpen(false);
            setFormError('');
        },
        onError: (e: any) => setFormError(e?.response?.data?.message || 'Failed to create member'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateTeamMember(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTeamMember,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
    });

    const resetPwMutation = useMutation({
        mutationFn: resetTeamMemberPassword,
        onSuccess: (data) => {
            setPwModal({ isOpen: true, password: data.password });
            setMenuOpen(null);
        },
    });

    // Form state
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', githubUsername: '', canVerifyTasks: false, password: '', role: 'member' as 'manager' | 'member' });
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        createMutation.mutate(form);
    };

    const displayedMembers = testerFilter === 'eligible'
        ? members.filter((m: any) => !!m.canVerifyTasks)
        : members;

    if (isLoading) return <div className="p-8 text-gray-400 text-sm">Loading team...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {displayedMembers.length} member{displayedMembers.length !== 1 ? 's' : ''}
                        {testerFilter === 'eligible' && <span> (can test)</span>}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            onClick={() => setTesterFilter('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${testerFilter === 'all'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setTesterFilter('eligible')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${testerFilter === 'eligible'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            Can Test
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => { setIsModalOpen(true); setFormError(''); setForm({ firstName: '', lastName: '', email: '', githubUsername: '', canVerifyTasks: false, password: '', role: 'member' }); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                </button>
            </div>

            {/* Member Table */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
                            <th className="px-6 py-3 text-left">Member</th>
                            <th className="px-6 py-3 text-left">Role</th>
                            <th className="px-6 py-3 text-left">Can Test</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {displayedMembers.map((m: any) => (
                            <tr key={m._id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${avatarColor(m._id)} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                                            {initials(m)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                                            <p className="text-xs text-gray-400">{m.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3.5">
                                    {m.role === 'admin' ? (
                                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${ROLE_STYLES[m.role]}`}>{m.role}</span>
                                    ) : (
                                        <select
                                            value={m.role}
                                            onChange={(e) => updateMutation.mutate({ id: m._id, data: { role: e.target.value } })}
                                            className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border-none bg-transparent cursor-pointer focus:ring-0 ${ROLE_STYLES[m.role]}`}
                                        >
                                            <option value="manager">Manager</option>
                                            <option value="member">Member</option>
                                        </select>
                                    )}
                                </td>
                                <td className="px-6 py-3.5">
                                    {m.role === 'admin' ? (
                                        <span className="text-[11px] font-semibold text-gray-400">N/A</span>
                                    ) : (
                                        <div className="inline-flex items-center gap-2">
                                            <div className="scale-75 origin-left">
                                                <Switch
                                                    checked={!!m.canVerifyTasks}
                                                    onChange={(checked) => updateMutation.mutate({ id: m._id, data: { canVerifyTasks: checked } })}
                                                />
                                            </div>
                                            <span className={`text-[11px] font-semibold ${m.canVerifyTasks ? 'text-green-700' : 'text-gray-500'}`}>
                                                {m.canVerifyTasks ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-3.5">
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {m.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                    {m.role !== 'admin' && (
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setMenuOpen(menuOpen === m._id ? null : m._id)}
                                                className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {menuOpen === m._id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                                                    <button
                                                        onClick={() => { updateMutation.mutate({ id: m._id, data: { isActive: !m.isActive } }); setMenuOpen(null); }}
                                                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${m.isActive ? 'text-amber-600' : 'text-green-600'}`}
                                                    >
                                                        {m.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                        {m.isActive ? 'Suspend' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => resetPwMutation.mutate(m._id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center gap-2 hover:bg-gray-50"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                        Reset Password
                                                    </button>
                                                    <div className="border-t border-gray-100 my-1" />
                                                    <button
                                                        onClick={() => { if (window.confirm(`Delete ${m.firstName} ${m.lastName}?`)) { deleteMutation.mutate(m._id); setMenuOpen(null); } }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 flex items-center gap-2 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
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
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Invite Team Member</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                                    <input name="firstName" value={form.firstName} onChange={handleFormChange} required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                                    <input name="lastName" value={form.lastName} onChange={handleFormChange} required
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                <input name="email" type="email" value={form.email} onChange={handleFormChange} required
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">GitHub Username (optional)</label>
                                <input name="githubUsername" value={form.githubUsername} onChange={handleFormChange}
                                    placeholder="e.g. octocat"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                                <div className="relative">
                                    <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleFormChange} required
                                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <button type="button" onClick={() => setShowPw(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                                <select name="role" value={form.role} onChange={handleFormChange}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <div className="scale-90 origin-left">
                                    <Switch
                                        checked={form.canVerifyTasks}
                                        onChange={(checked) => setForm(f => ({ ...f, canVerifyTasks: checked }))}
                                    />
                                </div>
                                <span>Can test/verify finished tasks</span>
                            </div>
                            {formError && <p className="text-sm text-red-500">{formError}</p>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending}
                                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    {createMutation.isPending ? 'Sending...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {pwModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-6 h-6 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold mb-2">Password Reset</h2>
                        <p className="text-sm text-gray-500 mb-4">Share this new password with the team member:</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between mb-6">
                            <span className="font-mono text-sm font-medium text-gray-800">{pwModal.password}</span>
                            <button onClick={() => navigator.clipboard.writeText(pwModal.password || '')}
                                className="text-indigo-600 text-xs font-semibold hover:text-indigo-700">Copy</button>
                        </div>
                        <button onClick={() => setPwModal({ isOpen: false })}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;
