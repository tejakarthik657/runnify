
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function diagnostic() {
    const logPath = 'c:/Projects/runni5/tmp/diag_log.txt';
    fs.writeFileSync(logPath, 'Starting Supabase Diagnostic with Service Role...\n', 'utf8');

    try {
        const envPath = 'c:/Projects/runni5/backend/.env';
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value.length > 0) {
                env[key.trim()] = value.join('=').trim();
            }
        });

        const SUPABASE_URL = env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
        const SUPABASE_BUCKET = env.SUPABASE_BUCKET;

        fs.appendFileSync(logPath, `URL: ${SUPABASE_URL}\n`);
        fs.appendFileSync(logPath, `Bucket: ${SUPABASE_BUCKET}\n`);
        fs.appendFileSync(logPath, `Using Service Role Key: ${!!SUPABASE_SERVICE_ROLE_KEY}\n`);

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            fs.appendFileSync(logPath, '❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env\n');
            return;
        }

        const testBuffer = Buffer.from('Diagnostic Test File Content ' + Date.now());
        const filename = `profiles/diag-service-role-${Date.now()}.txt`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;

        fs.appendFileSync(logPath, `Uploading to: ${uploadUrl}\n`);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'text/plain',
            },
            body: testBuffer
        });

        fs.appendFileSync(logPath, `Status: ${response.status}\n`);
        const text = await response.text();
        fs.appendFileSync(logPath, `Response: ${text}\n`);

        if (response.ok) {
            fs.appendFileSync(logPath, '✅ SUCCESS: Service Role bypass worked!\n');
        } else {
            fs.appendFileSync(logPath, '❌ FAILURE: Even Service Role failed. Check bucket name or URL.\n');
        }

    } catch (err) {
        fs.appendFileSync(logPath, 'Critical error: ' + err.message + '\n');
    }
}

diagnostic();
