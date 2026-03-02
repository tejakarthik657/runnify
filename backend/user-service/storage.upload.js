// user-service/storage.upload.js
// ============================================================
// SUPABASE STORAGE UPLOAD SERVICE
// ============================================================
// Free tier: 1GB storage + unlimited downloads
// No credit card required!

const crypto = require('crypto');

/**
 * Upload image buffer to Supabase Storage
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} mimeType - Image MIME type (e.g., 'image/jpeg')
 * @param {string} folder - Folder name ('moments' or 'profiles')
 * @returns {Promise<string>} Public Supabase storage URL
 */
async function uploadToSupabaseStorage(fileBuffer, mimeType, folder = 'moments') {
    const axios = require('axios');

    // Explicitly pull from process.env to ensure fresh values
    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
    const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const SUPABASE_BUCKET = (process.env.SUPABASE_BUCKET || '').trim();

    const uploadKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    const keyType = SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';

    console.log('[Supabase Upload] Env check:', {
        url: SUPABASE_URL ? 'PRESENT' : 'MISSING',
        bucket: SUPABASE_BUCKET,
        keyType,
        keyPrefix: uploadKey ? uploadKey.substring(0, 10) + '...' : 'MISSING',
        bufferSize: fileBuffer?.length
    });

    if (!SUPABASE_URL || !uploadKey || !SUPABASE_BUCKET) {
        throw new Error(`Missing Supabase config. URL: ${!!SUPABASE_URL}, Key: ${!!uploadKey}, Bucket: ${!!SUPABASE_BUCKET}`);
    }

    try {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(4).toString('hex');
        const extension = getExtensionFromMime(mimeType);
        const filename = `${folder}/${timestamp}-${randomStr}${extension}`;

        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;

        console.log('[Supabase Upload] Attempting upload to:', filename);

        const response = await axios.post(uploadUrl, fileBuffer, {
            headers: {
                'Authorization': `Bearer ${uploadKey}`,
                'apikey': uploadKey,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.status === 200 || response.status === 201) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
            console.log('[Supabase Upload] SUCCESS! URL:', publicUrl);
            return publicUrl;
        }

        throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
        if (error.response) {
            console.error('[Supabase Upload] Server Error:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });

            if (error.response.status === 403 || (error.response.data?.message?.includes('RLS'))) {
                console.error('CRITICAL: Supabase RLS is blocking this request even with the provided key.');
                console.error('Please ensure the bucket "territory-run-storage" exists and is set to PUBLIC.');
            }
        } else if (error.request) {
            console.error('[Supabase Upload] Network Error (No response):', error.message);
        } else {
            console.error('[Supabase Upload] Setup Error:', error.message);
        }
        throw error;
    }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType) {
    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
    };
    return mimeMap[mimeType] || '.jpg';
}

module.exports = { uploadToSupabaseStorage };
