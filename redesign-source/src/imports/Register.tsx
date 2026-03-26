import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, RegisterInput } from '@devmanager/shared/dist/auth.schema';
import { useAuth } from '../context/AuthContext';
import { register as registerApi } from '../services/auth';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
    const { login } = useAuth();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
        resolver: zodResolver(RegisterSchema),
    });

    const onSubmit = async (data: RegisterInput) => {
        try {
            const result = await registerApi(data);
            login(result.token, result.user);
        } catch (error) {
            console.error(error);
            alert('Registration failed');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Register Organization</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                        <input
                            {...register('organizationName')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                        {errors.organizationName && <p className="text-red-500 text-xs mt-1">{errors.organizationName.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input
                                {...register('firstName')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input
                                {...register('lastName')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                    </div>
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
                        Register
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">Already have an account? Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
