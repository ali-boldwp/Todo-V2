async function test() {
    try {
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        console.log('Login token:', loginData.token);

        if (!loginData.token) return;

        const res = await fetch('http://localhost:3000/api/github/config', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const text = await res.text();
        console.log('Config Status:', res.status);
        console.log('Config Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
