import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, uploadProjectDocument, deleteProjectDocument, downloadProjectDocument } from '../services/core';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Trash2, Download, Loader2, File, FilePlus } from 'lucide-react';
import Drawer from '../components/Drawer';

const ProjectDocuments: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => getProject(projectId!)
    });

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useMutation({
        mutationFn: (data: { title: string; description: string; fileData: string; mimeType: string; fileName: string }) =>
            uploadProjectDocument(projectId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            closeUploadModal();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (docId: string) => deleteProjectDocument(projectId!, docId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        }
    });

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        setTitle('');
        setDescription('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result as string;
            uploadMutation.mutate({
                title,
                description,
                fileData: base64Data,
                mimeType: file.type || 'application/octet-stream',
                fileName: file.name
            });
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = async (doc: any) => {
        const payload = doc.fileData
            ? doc
            : await downloadProjectDocument(projectId!, doc._id);
        const link = document.createElement('a');
        link.href = payload.fileData;
        link.download = payload.fileName || payload.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="p-8 text-gray-500">Loading documents...</div>;
    if (!project) return null;

    const documents = project.documents || [];

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-4 flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{documents.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Upload Document
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {documents.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">No documents yet</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Upload files, specs, or any materials related to this project.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {documents.map((doc: any) => {
                            const uploadedById = typeof doc.uploadedBy === 'string'
                                ? doc.uploadedBy
                                : doc.uploadedBy?._id;
                            const canDelete = user?.role === 'admin' || uploadedById === user?.id;
                            const uploaderName = [
                                doc.uploadedBy?.firstName,
                                doc.uploadedBy?.lastName
                            ].filter(Boolean).join(' ') || doc.uploadedBy?.email || 'Unknown';

                            return (
                                <div key={doc._id} className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <File className="w-5 h-5" />
                                        </div>
                                        {canDelete && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this document?')) {
                                                        deleteMutation.mutate(doc._id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete document"
                                            >
                                                {deleteMutation.isPending && deleteMutation.variables === doc._id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1" title={doc.title}>{doc.title}</h4>
                                    {doc.description && (
                                        <p className="text-xs text-gray-500 mb-4 line-clamp-2" title={doc.description}>{doc.description}</p>
                                    )}
                                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <div className="text-[10px] text-gray-400">
                                            <span className="block font-medium text-gray-600 truncate max-w-[120px]" title={uploaderName}>{uploaderName}</span>
                                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}
                                        </div>
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Upload Drawer */}
            <Drawer isOpen={isUploadModalOpen} onClose={closeUploadModal} title="Upload Document" size="md">
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="e.g. Project Specifications v2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none h-20"
                            placeholder="Optional notes about this document..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
                        <input
                            type="file"
                            required
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                    </div>

                    <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={closeUploadModal}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title || !file || uploadMutation.isPending}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FilePlus className="w-4 h-4 mr-2" />}
                            Upload
                        </button>
                    </div>
                </form>
            </Drawer>
        </div>
    );
};

export default ProjectDocuments;
