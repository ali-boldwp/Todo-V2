// Test: Simulate exchanging a fake/expired code to see what error GitHub returns
// This reveals if the issue is with OAuth App configuration (redirect URI mismatch)
// vs just an expired code

import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const clientId = process.env.GITHUB_CLIENT_ID?.replace(/"/g, '');
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.replace(/"/g, '');

    console.log('Client ID:', clientId);
    console.log('Client Secret length:', clientSecret?.length);

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: 'fake_code_to_test_error_message',
        }),
    });

    const data = await response.json();
    console.log('\nGitHub response to fake code:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\nIf error is "bad_verification_code" -> the OAuth app is set up correctly,');
    console.log('codes are just single-use and expire. This would be normal.');
    console.log('\nIf error is "redirect_uri_mismatch" -> the OAuth app callback URL is wrong.');

    process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
