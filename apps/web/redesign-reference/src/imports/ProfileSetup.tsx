import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProfileSetupStatus, uploadProfileImage } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const ProfileSetup: React.FC = () => {
    const { setAuthFromToken, logout } = useAuth();
    const [imageData, setImageData] = useState<string>('');
    const [localError, setLocalError] = useState('');

    const { data: status, isLoading } = useQuery({
        queryKey: ['profile-setup-status'],
        queryFn: getProfileSetupStatus,
    });

    const previewImage = useMemo(
        () => imageData || status?.profileImageUrl || '',
        [imageData, status?.profileImageUrl]
    );

    const uploadMutation = useMutation({
        mutationFn: (data: string) => uploadProfileImage(data),
        onSuccess: (result) => {
            setAuthFromToken(result.token);
        },
        onError: (error: any) => {
            setLocalError(error?.response?.data?.message || 'Failed to upload profile image');
        }
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setLocalError('Please select a valid image file.');
            return;
        }
        if (file.size > 1_500_000) {
            setLocalError('Please upload an image smaller than 1.5MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImageData(String(reader.result || ''));
            setLocalError('');
        };
        reader.onerror = () => setLocalError('Unable to read selected image.');
        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                <p className="text-sm text-gray-600 mt-2">
                    Upload your profile image to continue. This is required for all users before accessing the portal.
                </p>

                <div className="mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    {isLoading ? (
                        <p className="text-sm text-gray-500">Checking profile status...</p>
                    ) : status?.profileSetupCompleted ? (
                        <p className="text-sm text-green-700">Profile image already uploaded. Redirecting...</p>
                    ) : (
                        <p className="text-sm text-amber-700">Profile image is required.</p>
                    )}
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                        {previewImage ? (
                            <img src={previewImage} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs text-gray-400">No Image</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
                        />
                        <p className="text-xs text-gray-500 mt-2">Accepted: PNG, JPG, WEBP, GIF. Max 1.5MB.</p>
                    </div>
                </div>

                {localError && (
                    <p className="mt-4 text-sm text-red-600">{localError}</p>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={() => imageData && uploadMutation.mutate(imageData)}
                        disabled={!imageData || uploadMutation.isPending}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {uploadMutation.isPending ? 'Uploading...' : 'Save Profile Image'}
                    </button>
                    <button
                        onClick={logout}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetup;
