import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Mail, Phone, MapPin, Building2, User, MoreVertical, Shield, ShieldOff, KeyRound, Trash2 } from 'lucide-react';
import { getClients, createClient, toggleClientStatus, resetClientPassword, deleteClient } from '../../services/client';
import { ClientSchema, ClientInput } from '@devmanager/shared/dist/client.schema';

export function ClientsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
    const [passwordResetModal, setPasswordResetModal] = useState<{ isOpen: boolean; password?: string }>({ isOpen: false });

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: getClients
    });

    const createMutation = useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsModalOpen(false);
            reset();
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => toggleClientStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsMenuOpen(null);
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: resetClientPassword,
        onSuccess: (data) => {
            setPasswordResetModal({ isOpen: true, password: data.password });
            setIsMenuOpen(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsMenuOpen(null);
        }
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientInput>({
        resolver: zodResolver(ClientSchema),
        defaultValues: {
            type: 'external'
        }
    });

    const onSubmit = (data: ClientInput) => {
        createMutation.mutate(data);
    };

    const handleAction = (action: string, client: any) => {
        if (action === 'suspend') {
            toggleStatusMutation.mutate({ id: client._id, status: 'suspended' });
        } else if (action === 'activate') {
            toggleStatusMutation.mutate({ id: client._id, status: 'active' });
        } else if (action === 'reset-password') {
            if (window.confirm(`Are you sure you want to reset password for ${client.name}?`)) {
                resetPasswordMutation.mutate(client._id);
            }
        } else if (action === 'delete') {
            if (window.confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
                deleteMutation.mutate(client._id);
            }
        }
    };

    const filteredClients = clients?.filter((client: any) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
                    <p className="text-gray-600">Manage your client relationships</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    Add Client
                </button>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search clients..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients?.map((client: any) => (
                    <div key={client._id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${client.type === 'internal' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                    }`}>
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-800">{client.name}</h3>
                                        {client.status === 'suspended' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                Suspended
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${client.type === 'internal' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                        }`}>
                                        {client.type}
                                    </span>
                                </div>
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(isMenuOpen === client._id ? null : client._id)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                >
                                    <MoreVertical size={20} />
                                </button>
                                {isMenuOpen === client._id && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                                        {client.status === 'suspended' ? (
                                            <button
                                                onClick={() => handleAction('activate', client)}
                                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Shield size={16} />
                                                Activate Client
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAction('suspend', client)}
                                                className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <ShieldOff size={16} />
                                                Suspend Client
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleAction('reset-password', client)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <KeyRound size={16} />
                                            Reset Password
                                        </button>
                                        <button
                                            onClick={() => handleAction('delete', client)}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            Delete Client
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600">
                            {client.email && (
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-400" />
                                    <span>{client.email}</span>
                                </div>
                            )}
                            {client.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-gray-400" />
                                    <span>{client.phone}</span>
                                </div>
                            )}
                            {client.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span>{client.address}</span>
                                </div>
                            )}
                            {client.userId && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-indigo-600">
                                    <User size={16} />
                                    <span className="font-medium">User Account Active</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Client</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    {...register('name')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    {...register('type')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="external">External</option>
                                    <option value="internal">Internal</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Used for client portal login"
                                />
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                <input
                                    {...register('phone')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                                <textarea
                                    {...register('address')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    rows={3}
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {passwordResetModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <KeyRound size={24} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Password Reset Successful</h2>
                        <p className="text-gray-600 mb-4">
                            The client's password has been reset. Please copy the new password below:
                        </p>
                        <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between mb-6">
                            <span className="font-mono font-medium text-gray-800">{passwordResetModal.password}</span>
                            <button
                                onClick={() => navigator.clipboard.writeText(passwordResetModal.password || '')}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                                Copy
                            </button>
                        </div>
                        <button
                            onClick={() => setPasswordResetModal({ isOpen: false })}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}