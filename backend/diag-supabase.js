const axios = require('axios');
require('dotenv').config();

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } = process.env;

async function diagnose() {
    console.log('--- SUPABASE STORAGE DIAGNOSTIC ---');
    console.log('URL:', SUPABASE_URL);
    console.log('Bucket:', SUPABASE_BUCKET);

    const testKey = (key) => key ? `${key.substring(0, 10)}... (Length: ${key.length})` : 'MISSING';
    console.log('Anon Key:', testKey(SUPABASE_ANON_KEY));
    console.log('Service Role Key:', testKey(SUPABASE_SERVICE_ROLE_KEY));

    const keysToTest = [
        { name: 'ANON', key: SUPABASE_ANON_KEY },
        { name: 'SERVICE_ROLE', key: SUPABASE_SERVICE_ROLE_KEY }
    ];

    for (const { name, key } of keysToTest) {
        if (!key) {
            console.log(`\n[${name}] Skipping (not provided)`);
            continue;
        }

        console.log(`\n[${name}] Testing connectivity...`);
        try {
            // 1. Try to list objects (checks SELECT permission)
            const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`;
            const listRes = await axios.post(listUrl, { prefix: '', limit: 1, offset: 0 }, {
                headers: { 'Authorization': `Bearer ${key}`, 'apikey': key }
            });
            console.log(`[${name}] ✅ SELECT permission works (found ${listRes.data.length} objects)`);
        } catch (err) {
            console.log(`[${name}] ❌ SELECT permission FAILED: ${err.response?.status} ${JSON.stringify(err.response?.data || err.message)}`);
        }

        try {
            // 2. Try a small dummy upload (checks INSERT permission)
            const filename = `diag-test-${Date.now()}.txt`;
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;
            await axios.post(uploadUrl, Buffer.from('Diagnostic test'), {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'apikey': key,
                    'Content-Type': 'text/plain'
                }
            });
            console.log(`[${name}] ✅ INSERT permission works (uploaded ${filename})`);

            // Cleanup
            await axios.delete(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}`, {
                data: { prefixes: [filename] },
                headers: { 'Authorization': `Bearer ${key}`, 'apikey': key }
            });
            console.log(`[${name}] ✅ DELETE permission works`);
        } catch (err) {
            console.log(`[${name}] ❌ INSERT/DELETE permission FAILED: ${err.response?.status} ${JSON.stringify(err.response?.data || err.message)}`);
        }
    }

    console.log('\n--- DIAGNOSTIC COMPLETE ---');
    console.log('If SERVICE_ROLE fails with 403, your service_role key might be invalid or for a different project.');
    console.log('If SERVICE_ROLE works but the app still fails, ensure you HAVE RESTARTED the backend server.');
}

diagnose();
