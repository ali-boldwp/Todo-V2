import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const token = jwt.sign(
        { userId: '69962fe55857704b2b3db356', role: 'admin' },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '1d' }
    );

    // Test auth URL endpoint
    const res1 = await fetch('http://localhost:3030/api/github/auth/url', {
        headers: { Authorization: 'Bearer ' + token }
    });
    const data1 = await res1.json();
    console.log('Auth URL status:', res1.status, JSON.stringify(data1));

    // Test callback with fake code — to reveal what error the backend sends 
    const res2 = await fetch('http://localhost:3030/api/github/auth/callback', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'fake_test_code_xyz' })
    });
    const data2 = await res2.json();
    console.log('Callback status:', res2.status, JSON.stringify(data2));
}

main().catch(console.error);
