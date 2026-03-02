
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const crypto = require('crypto');

const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_BUCKET
} = process.env;

async function testUpload() {
    console.log('--- Supabase Diagnostic Test ---');
    console.log('URL:', SUPABASE_URL);
    console.log('Bucket:', SUPABASE_BUCKET);
    console.log('Anon Key Present:', !!SUPABASE_ANON_KEY);

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET) {
        console.error('❌ Missing environment variables!');
        return;
    }

    const testBuffer = Buffer.from('Diagnostic Test File Content');
    const folder = 'profiles';
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(6).toString('hex');
    const filename = `${folder}/test-${timestamp}-${randomStr}.txt`;
    const mimeType = 'text/plain';

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;
    console.log('Uploading to:', uploadUrl);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': mimeType,
            },
            body: testBuffer
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);

        if (response.ok) {
            console.log('✅ Upload Success!');
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log('Public URL:', publicUrl);
        } else {
            console.error('❌ Upload Failed.');
            try {
                const json = JSON.parse(text);
                if (json.error === 'new_rows_violated_policy') {
                    console.error('PROBABLE CAUSE: RLS Policies on Supabase are preventing anonymous uploads.');
                }
            } catch (e) { }
        }
    } catch (error) {
        console.error('❌ Critical Error during fetch:', error);
    }
}

testUpload();
