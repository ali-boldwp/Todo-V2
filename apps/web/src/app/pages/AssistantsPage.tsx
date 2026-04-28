import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search, Mail, User, Trash2, KeyRound } from 'lucide-react';
import { getAssistants, createAssistant, deleteAssistant } from '../../services/assistant';

export function AssistantsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const { data: assistants, isLoading } = useQuery({
        queryKey: ['assistants'],
        queryFn: getAssistants
    });

    const createMutation = useMutation({
        mutationFn: createAssistant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistants'] });
            setIsModalOpen(false);
            reset();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAssistant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistants'] });
        }
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: ''
        }
    });

    const onSubmit = (data: any) => {
        createMutation.mutate(data);
    };

    const handleDelete = (assistant: any) => {
        if (window.confirm(`Are you sure you want to remove ${assistant.firstName}? This action cannot be undone.`)) {
            deleteMutation.mutate(assistant._id);
        }
    };

    const filteredAssistants = assistants?.filter((a: any) =>
        (a.firstName + ' ' + a.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Assistants</h1>
                    <p className="text-slate-500 mt-1">Manage assistants delegated to your account</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold"
                >
                    <Plus size={20} strokeWidth={2.5} />
                    Add Assistant
                </button>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search assistants..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredAssistants?.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="text-indigo-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No assistants found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">You haven't added any assistants yet. Add an assistant to help manage your projects.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssistants?.map((assistant: any) => (
                        <div key={assistant._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                        {assistant.firstName?.[0]}{assistant.lastName?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{assistant.firstName} {assistant.lastName}</h3>
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold mt-1 inline-block">
                                            Client Assistant
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(assistant)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove Assistant"
                                >
                                    <Trash2 size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="space-y-3 mt-5 pt-5 border-t border-slate-100 text-sm text-slate-600">
                                {assistant.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Mail size={16} />
                                        </div>
                                        <span className="font-medium">{assistant.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Add Assistant</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                                    <input
                                        {...register('firstName', { required: 'First name is required' })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                                    />
                                    {errors.firstName && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.firstName.message as string}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                                    <input
                                        {...register('lastName', { required: 'Last name is required' })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                                    />
                                    {errors.lastName && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.lastName.message as string}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                <input
                                    {...register('email', { required: 'Email is required' })}
                                    type="email"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                                />
                                {errors.email && <p className="text-rose-500 text-xs mt-1.5 font-medium">{errors.email.message as string}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        {...register('password')}
                                        type="password"
                                        placeholder="Leave empty for default 'password123'"
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-6 mt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Adding...' : 'Add Assistant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
