import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendance, checkIn, checkOut } from '../services/attendance';

const Attendance: React.FC = () => {
    const { data: attendanceList, isLoading } = useQuery({ queryKey: ['attendance'], queryFn: getAttendance });
    const queryClient = useQueryClient();

    const checkInMutation = useMutation({
        mutationFn: checkIn,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to check in'),
    });

    const checkOutMutation = useMutation({
        mutationFn: checkOut,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to check out'),
    });

    if (isLoading) return <div>Loading...</div>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysAttendance = attendanceList?.find((a: any) => new Date(a.date).getTime() === today.getTime());

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Attendance</h1>

            <div className="bg-white p-6 rounded shadow mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Today's Status</h2>
                    <p className="text-gray-600">{new Date().toLocaleDateString()}</p>
                    {todaysAttendance ? (
                        <div className="mt-2 text-sm">
                            <span className={`font-bold ${todaysAttendance.checkInTime ? 'text-green-600' : 'text-gray-500'}`}>
                                In: {todaysAttendance.checkInTime ? new Date(todaysAttendance.checkInTime).toLocaleTimeString() : '-'}
                            </span>
                            <span className="mx-2">|</span>
                            <span className={`font-bold ${todaysAttendance.checkOutTime ? 'text-red-600' : 'text-gray-500'}`}>
                                Out: {todaysAttendance.checkOutTime ? new Date(todaysAttendance.checkOutTime).toLocaleTimeString() : '-'}
                            </span>
                        </div>
                    ) : (
                        <p className="text-gray-500 mt-2">Not checked in yet</p>
                    )}
                </div>

                <div>
                    {!todaysAttendance ? (
                        <button
                            onClick={() => checkInMutation.mutate()}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
                        >
                            CHECK IN
                        </button>
                    ) : !todaysAttendance.checkOutTime ? (
                        <button
                            onClick={() => checkOutMutation.mutate()}
                            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold"
                        >
                            CHECK OUT
                        </button>
                    ) : (
                        <button className="bg-gray-300 text-gray-600 px-6 py-2 rounded cursor-not-allowed font-bold" disabled>
                            COMPLETED
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                <h3 className="px-6 py-4 font-semibold border-b bg-gray-50">History</h3>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {attendanceList?.map((attendance: any) => (
                            <tr key={attendance._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(attendance.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString() : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {attendance.duration ? `${Math.floor(attendance.duration / 60)}h ${attendance.duration % 60}m` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;
