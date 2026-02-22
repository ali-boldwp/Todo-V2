import jwt from 'jsonwebtoken';

async function test() {
    // Fake JWT for standard admin structure
    // I will use an invalid organizationId to see if that triggers the error
    const token = jwt.sign(
        { userId: '507f1f77bcf86cd799439011', role: 'admin', organizationId: null },
        'supersecretkey',
        { expiresIn: '24h' }
    );

    try {
        const res = await fetch('http://localhost:3000/api/github/config', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
