---
name: supabase-storage-cleanup
description: Instructions and guidelines on how to run the automated script that removes orphaned files (images, pdfs, audios) from Supabase Storage.
---

# Supabase Storage Cleanup

## Overview
Over time, the `lesson-resources` bucket in Supabase Storage may accumulate "orphaned" files—media that was uploaded but is no longer referenced anywhere in the database (e.g., from deleted lessons, user avatars, or course covers).

This skill provides a documented procedure to find and permanently delete these files to save egress and storage costs.

## Prerequisites
1. **Node.js**: Ensure you have Node.js and `npx` (or `tsx`) installed.
2. **Environment Variables**: The script relies on the `.env.local` file at the root of the project. You must have the following keys configured:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required **only** if you intend to perform deletions, as the Anon Key cannot bypass RLS for deletion operations).

## The Script
The cleanup logic is implemented in `scripts/cleanupImages.ts`. 

It operates by:
1. Fetching all available files across subfolders (e.g. `images/`, `pdfs/`, `audios/`) inside the `lesson-resources` bucket.
2. Scanning the database tables (`courses`, `profiles`, and `lessons`, including `content_blocks`) to collect all actively utilized media URLs.
3. Comparing the two sets to find any Storage file that does not have a corresponding database reference.

## Usage Guide

You can run the script in two modes directly from the project root (`c:\Users\Alexandre-Janaina\Documents\studysystem---ads-case-study (1)`).

### 1. Dry-Run Mode (Safe / Default)
To see which files are considered orphaned without actually deleting them:
```bash
npx tsx scripts/cleanupImages.ts
```
**Expected Output:** A summary detailing how many total files exist, how many are active, and a list of paths belonging to unused orphans.

### 2. Deletion Mode (Warning: Irreversible)
If you have verified the dry-run output and wish to permanently free up space:
```bash
npx tsx scripts/cleanupImages.ts --delete
```
**Expected Output:** The script will batch delete the unused files natively in Supabase and confirm how many were successfully removed.

## Best Practices
- **Always run in Dry-Run mode first.** Carefully review the output to make sure no actively used file is about to be deleted by mistake (e.g., files added very recently that might not be fully linked yet).
- Validate that your `SUPABASE_SERVICE_ROLE_KEY` is kept secret and not exposed to the client in version control `(e.g., never prepend VITE_ to this key)`.
