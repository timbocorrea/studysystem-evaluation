import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple approach to load environment variables from .env or .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

function loadEnv(filePath: string) {
    if (fs.existsSync(filePath)) {
        const envConfig = fs.readFileSync(filePath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                // remove quotes and trim
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                if (!process.env[match[1]]) {
                    process.env[match[1]] = val;
                }
            }
        });
    }
}

loadEnv(envLocalPath);
loadEnv(envPath);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key if available for broader access, otherwise anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const BUCKET_NAME = 'lesson-resources';
const SUBFOLDERS = ['general', 'images', 'pdfs', 'audios', 'video-thumbnails'];

const isDryRun = !process.argv.includes('--delete');

/**
 * Extracts just the relative path that the storage bucket uses
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/lesson-resources/images/file.jpg" -> "images/file.jpg"
 */
function extractStoragePath(url: string | null): string {
    if (!url) return '';
    try {
        if (url.includes(`/${BUCKET_NAME}/`)) {
            const parts = url.split(`/${BUCKET_NAME}/`);
            if (parts.length > 1) {
                // remove any query params
                return parts[parts.length - 1].split('?')[0];
            }
        }

        // Se a url já for o formato filepath (e.g "images/xyz.png")
        if (!url.startsWith('http')) {
            return url.split('?')[0];
        }

        return ''; // Se a URL não pertence a esse bucket, retorna vazio para não contar como hit
    } catch {
        return '';
    }
}

async function getAllStorageFiles(): Promise<string[]> {
    console.log(`\n📦 Fetching all files from bucket: ${BUCKET_NAME}...`);
    const allFiles: string[] = [];

    // The Supabase storage JS client doesn't recursively list, so we list known subfolders
    // plus the root folder ('')
    const foldersToScan = ['', ...SUBFOLDERS];

    for (const folder of foldersToScan) {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
            limit: 10000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });

        if (error) {
            console.error(`Error listing folder '${folder}':`, error.message);
            continue;
        }

        if (data) {
            for (const file of data) {
                // Skip directories/placeholders
                if (!file.id || file.name === '.emptyFolderPlaceholder') continue;

                const fullPath = folder ? `${folder}/${file.name}` : file.name;
                allFiles.push(fullPath);
            }
        }
    }

    console.log(`✓ Found ${allFiles.length} files in Storage.`);
    return allFiles;
}

async function getActiveUrlsFromDatabase(): Promise<Set<string>> {
    console.log(`\n🔍 Scanning database for active file references...`);
    const activePaths = new Set<string>();

    // 1. Scan Courses
    console.log(`  Scanning courses...`);
    const { data: courses, error: coursesError } = await supabase.from('courses').select('image_url');
    if (coursesError) {
        console.error('Error fetching courses:', coursesError.message);
    } else if (courses) {
        let count = 0;
        for (const course of courses) {
            if (course.image_url) {
                const path = extractStoragePath(course.image_url);
                if (path) { activePaths.add(path); count++; }
            }
        }
        console.log(`    Found ${count} references in courses.`);
    }

    // 2. Scan Lessons (with pagination)
    console.log(`  Scanning lessons (fetching in chunks to prevent timeout)...`);
    let count = 0;
    let page = 0;
    const pageSize = 10;

    while (true) {
        process.stdout.write(`    Fetching page ${page + 1}... `);
        const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, image_url, audio_url, video_url, video_urls, content_blocks')
            .order('id', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (lessonsError) {
            console.log(`[ERROR: ${lessonsError.message}]`);
            break;
        }

        if (!lessons || lessons.length === 0) {
            console.log('[DONE]');
            break;
        }

        console.log(`[OK - ${lessons.length} rows]`);

        for (const lesson of lessons) {
            // Check direct lesson URLs
            if (lesson.image_url) { const p = extractStoragePath(lesson.image_url); if (p) { activePaths.add(p); count++; } }
            if (lesson.audio_url) { const p = extractStoragePath(lesson.audio_url); if (p) { activePaths.add(p); count++; } }
            if (lesson.video_url) { const p = extractStoragePath(lesson.video_url); if (p) { activePaths.add(p); count++; } }
            if (lesson.video_urls && Array.isArray(lesson.video_urls)) {
                for (const url of lesson.video_urls) {
                    const p = extractStoragePath(url); if (p) { activePaths.add(p); count++; }
                }
            }

            // Check content blocks
            if (lesson.content_blocks && Array.isArray(lesson.content_blocks)) {
                for (const block of lesson.content_blocks) {
                    if (block.type === 'IMAGE' && block.content) {
                        const p = extractStoragePath(block.content); if (p) { activePaths.add(p); count++; }
                    }
                    if (block.imageUrl) { const p = extractStoragePath(block.imageUrl); if (p) { activePaths.add(p); count++; } }
                    if (block.audioUrl) { const p = extractStoragePath(block.audioUrl); if (p) { activePaths.add(p); count++; } }
                    if (block.videoUrl) { const p = extractStoragePath(block.videoUrl); if (p) { activePaths.add(p); count++; } }
                    if (block.videoUrls && Array.isArray(block.videoUrls)) {
                        for (const url of block.videoUrls) {
                            const p = extractStoragePath(url); if (p) { activePaths.add(p); count++; }
                        }
                    }
                }
            }
        }

        page++;
    }
    console.log(`    Found ${count} references in lessons.`);

    console.log(`✓ Total unique active references found: ${activePaths.size}`);
    return activePaths;
}

async function runCleanup() {
    console.log('================================================');
    console.log('   SUPABASE STORAGE CLEANUP UTILITY');
    console.log('================================================');
    if (isDryRun) {
        console.log('⚠️  RUNNING IN DRY-RUN MODE (No files will be deleted)');
        console.log('   Run with --delete to actually remove files.');
    } else {
        console.log('🚨 RUNNING IN DELETE MODE (Unused files WILL BE DELETED)');
    }
    console.log('================================================\n');

    const storageFiles = await getAllStorageFiles();
    const activePaths = await getActiveUrlsFromDatabase();

    const unusedFiles = storageFiles.filter(file => !activePaths.has(file));

    console.log('\n🔍 Active Paths in DB:', Array.from(activePaths));

    console.log(`\n📊 SUMMARY`);
    console.log(`Total files in storage: ${storageFiles.length}`);
    console.log(`Total active files in DB: ${activePaths.size}`);
    console.log(`Orphaned (unused) files: ${unusedFiles.length}`);

    if (unusedFiles.length > 0) {
        console.log('\n📝 List of unused files:');
        unusedFiles.forEach(f => console.log(`  - ${f}`));

        if (!isDryRun) {
            console.log(`\n🗑️  Deleting ${unusedFiles.length} files...`);

            // Delete in batches of 100 to avoid limits
            const batchSize = 100;
            let deletedCount = 0;

            for (let i = 0; i < unusedFiles.length; i += batchSize) {
                const batch = unusedFiles.slice(i, i + batchSize);
                const { data, error } = await supabase.storage.from(BUCKET_NAME).remove(batch);

                if (error) {
                    console.error('Error deleting batch:', error.message);
                } else if (data) {
                    deletedCount += data.length;
                    if (data.length === 0) {
                        console.log('Batch delete returned 0 files. Attempting to verify with RLS/Auth or checking if path format requires adjustments.');
                        console.log('Batch data result:', data);
                    }
                }
            }
            console.log(`✅ Successfully deleted ${deletedCount} files.`);
        }
    } else {
        console.log('\n✨ No unused files found. Your storage is clean!');
    }

    console.log('\nDone.');
}

runCleanup().catch(console.error);
