import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { LoginSchema, LoginInput } from '@devmanager/shared/dist/auth.schema';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../services/auth';

const isValidIdeRedirectUrl = (redirectUri: string | null): boolean => {
    if (!redirectUri) return false;
    try {
        const url = new URL(redirectUri);
        const isHttp = url.protocol === 'http:';
        const isLocalhost = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
        return isHttp && isLocalhost;
    } catch {
        return false;
    }
};

const Login: React.FC = () => {
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    const [serverError, setServerError] = React.useState('');
    const ide = searchParams.get('ide');
    const redirectUri = searchParams.get('redirect_uri');
    const state = searchParams.get('state');
    const isIdeWebstorm = ide === 'webstorm';
    const hasValidIdeRedirect = isIdeWebstorm && isValidIdeRedirectUrl(redirectUri);
    const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
    });

    const onSubmit = async (data: LoginInput) => {
        try {
            setServerError('');
            const result = await loginApi(data);
            if (hasValidIdeRedirect && redirectUri) {
                const callbackUrl = new URL(redirectUri);
                callbackUrl.searchParams.set('token', result.token);
                if (state) callbackUrl.searchParams.set('state', state);
                window.location.replace(callbackUrl.toString());
                return;
            }
            login(result.token, result.user);
        } catch (error: any) {
            console.error(error);
            const apiMessage =
                error?.response?.data?.message ||
                (Array.isArray(error?.response?.data?.errors) && error.response.data.errors[0]?.message) ||
                'Login failed';
            setServerError(apiMessage);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Login to DevManager</h2>
                {hasValidIdeRedirect && (
                    <div className="mb-4 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                        <p className="text-sm font-semibold text-indigo-800">Authorizing WebStorm</p>
                        <p className="mt-1 text-xs text-indigo-700">
                            Sign in to continue and return to your IDE.
                        </p>
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email')}
                            type="email"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            {...register('password')}
                            type="password"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Sign In
                    </button>
                    {serverError && <p className="text-red-500 text-xs mt-1">{serverError}</p>}
                </form>
            </div>
        </div>
    );
};

export default Login;
