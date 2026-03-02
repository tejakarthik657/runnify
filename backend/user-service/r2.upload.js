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
    const {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        SUPABASE_BUCKET
    } = process.env;

    // Validate required env vars
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET) {
        throw new Error('Missing Supabase credentials: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET');
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(6).toString('hex');
        const extension = getExtensionFromMime(mimeType);
        const filename = `${folder}/${timestamp}-${randomStr}${extension}`;

        // Upload to Supabase Storage
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filename}`;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': mimeType,
            },
            body: fileBuffer,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Supabase upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        // Return public URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
        return publicUrl;
    } catch (error) {
        console.error('Supabase storage upload error:', error);
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
