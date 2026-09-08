import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.resolve(__dirname, '../.env.local');

function loadEnv(filePath: string) {
    if (fs.existsSync(filePath)) {
        const envConfig = fs.readFileSync(filePath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                if (!process.env[match[1]]) process.env[match[1]] = val;
            }
        });
    }
}

loadEnv(envLocalPath);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const BUCKET_NAME = 'lesson-resources';
const isDryRun = !process.argv.includes('--delete');

function isSupabaseAudio(url: string | null): boolean {
    if (!url) return false;
    return url.includes('supabase.co') && url.includes(`/${BUCKET_NAME}/audios/`);
}

async function cleanDatabaseAudios(): Promise<number> {
    console.log(`\n🔍 Scanning 'lessons' table for Supabase audio links...`);
    let page = 0;
    const pageSize = 50;
    let totalUpdated = 0;

    while (true) {
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('id, audio_url, content_blocks')
            .order('id', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching lessons:', error.message);
            break;
        }

        if (!lessons || lessons.length === 0) break;

        for (const lesson of lessons) {
            let needsUpdate = false;
            let updatedAudioUrl = lesson.audio_url;
            let updatedBlocks = lesson.content_blocks ? [...lesson.content_blocks] : null;

            // Check main audio_url
            if (isSupabaseAudio(updatedAudioUrl)) {
                updatedAudioUrl = null;
                needsUpdate = true;
            }

            // Check content blocks
            if (updatedBlocks && Array.isArray(updatedBlocks)) {
                for (let i = 0; i < updatedBlocks.length; i++) {
                    const block = updatedBlocks[i];
                    if (isSupabaseAudio(block.audioUrl)) {
                        delete block.audioUrl;
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                if (isDryRun) {
                    console.log(`  - [Dry-Run] Would update lesson ID: ${lesson.id}`);
                    totalUpdated++;
                } else {
                    const { error: updateError } = await supabase
                        .from('lessons')
                        .update({
                            audio_url: updatedAudioUrl,
                            content_blocks: updatedBlocks
                        })
                        .eq('id', lesson.id);

                    if (updateError) {
                        console.error(`  - Failed to update lesson ID ${lesson.id}:`, updateError.message);
                    } else {
                        console.log(`  - Successfully cleared Supabase audios for lesson ID: ${lesson.id}`);
                        totalUpdated++;
                    }
                }
            }
        }
        page++;
    }

    return totalUpdated;
}

async function deleteStorageAudios(): Promise<number> {
    console.log(`\n📦 Fetching files from '${BUCKET_NAME}/audios' bucket...`);

    const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list('audios', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
        console.error('Error listing audios:', error.message);
        return 0;
    }

    if (!files || files.length === 0) {
        console.log('  - No audio files found in bucket.');
        return 0;
    }

    const filePathsToDelete = files
        .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
        .map(f => `audios/${f.name}`);

    if (filePathsToDelete.length === 0) {
        console.log('  - No valid audio files to delete.');
        return 0;
    }

    console.log(`  - Found ${filePathsToDelete.length} audio file(s) in Storage.`);

    if (isDryRun) {
        console.log('  - [Dry-Run] The following files would be deleted:');
        filePathsToDelete.forEach(f => console.log(`      * ${f}`));
        return filePathsToDelete.length;
    }

    console.log(`\n🗑️  Deleting ${filePathsToDelete.length} file(s) from Storage...`);

    const { data: deleted, error: delError } = await supabase.storage.from(BUCKET_NAME).remove(filePathsToDelete);

    if (delError) {
        console.error('  - Error deleting storage files:', delError.message);
        return 0;
    }

    if (deleted && deleted.length === 0) {
        console.log('  - Error: Storage returned success but 0 files deleted. Did you add the Service Role Key?');
    } else {
        console.log(`  ✅ Successfully deleted ${deleted?.length || 0} audio file(s) from Storage.`);
    }

    return deleted?.length || 0;
}

async function run() {
    console.log('================================================');
    console.log('   SUPABASE AUDIO REMOVAL UTILITY');
    console.log('================================================');
    if (isDryRun) {
        console.log('⚠️  RUNNING IN DRY-RUN MODE (No data will be changed)');
        console.log('   Run with --delete to actually execute.');
    } else {
        console.log('🚨 RUNNING IN DELETE MODE (Irreversible)');
    }
    console.log('================================================\n');

    const updatedLessons = await cleanDatabaseAudios();
    const deletedFiles = await deleteStorageAudios();

    console.log(`\n📊 FINAL RECORD`);
    console.log(`Lessons sanitised: ${updatedLessons}`);
    console.log(`Audios permanently deleted from Storage: ${deletedFiles}`);
    console.log('\nDone.');
}

run().catch(console.error);
