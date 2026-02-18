import api from './api';

export const getPayslips = async () => {
    const response = await api.get('/payroll/payslips');
    return response.data;
};

// Admin only functions could be added here
