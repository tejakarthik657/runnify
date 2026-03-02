
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

// Load .env manually to be sure
const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Loading .env from:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('❌ .env file NOT FOUND at:', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = env.SUPABASE_BUCKET;

async function testUpload() {
    console.log('--- Supabase Diagnostic Test (Axios) ---');
    console.log('URL:', SUPABASE_URL);
    console.log('Bucket:', SUPABASE_BUCKET);
    console.log('Anon Key Present:', !!SUPABASE_ANON_KEY);

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET) {
        console.error('❌ Missing environment variables in .env!');
        process.exit(1);
    }

    const testBuffer = Buffer.from('Diagnostic Test File Content ' + Date.now());
    const folder = 'profiles';
    const filename = `${folder}/diag-${Date.now()}.txt`;

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;
    console.log('Uploading to:', uploadUrl);

    try {
        const response = await axios.post(uploadUrl, testBuffer, {
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'text/plain',
            }
        });

        console.log('Status:', response.status);
        console.log('Response Data:', response.data);
        console.log('✅ Upload Success!');
    } catch (error) {
        console.error('❌ Upload Failed.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));

            if (error.response.data.error === 'new_rows_violated_policy') {
                console.error('PROBABLE CAUSE: RLS Policies on Supabase are preventing anonymous uploads.');
                console.error('FIX: Run this SQL in Supabase SQL Editor:');
                console.error(`
-- 1. Enable RLS on storage.objects if not already enabled
-- 2. Create policy to allow public inserts to the bucket
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${SUPABASE_BUCKET}');
                `);
            }
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testUpload();
