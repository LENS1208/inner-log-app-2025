/*
  # Fix user avatars storage security vulnerability

  ## Security Issue
  Current policy allows any authenticated user to upload files to ANY path in the user-avatars bucket.
  This means users can overwrite or upload files to other users' avatar paths.

  ## Changes
  1. Drop existing insecure policies
  2. Create secure policies that restrict users to their own folder path:
     - Users can only INSERT to paths starting with `avatars/{their-user-id}-`
     - Users can only UPDATE/DELETE files they own (owner = auth.uid())
     - Public can still read all avatars (for profile display)

  ## Security
  - Users CANNOT upload to other users' paths
  - Users CANNOT modify other users' files
  - Each user's files are protected by owner check
*/

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create secure policy for uploading avatars (INSERT)
-- Users can only upload to paths that start with "avatars/{their-user-id}-"
CREATE POLICY "Users can upload to own avatar path"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND name ~ ('^avatars/' || auth.uid()::text || '-')
  );

-- Create secure policy for updating avatars (UPDATE)
-- Users can only update files they own
CREATE POLICY "Users can update own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars' 
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'user-avatars' 
    AND owner = auth.uid()
  );

-- Create secure policy for deleting avatars (DELETE)
-- Users can only delete files they own
CREATE POLICY "Users can delete own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars' 
    AND owner = auth.uid()
  );

-- Create policy for public read access to avatars
-- Anyone can view avatar images (needed for profile display)
CREATE POLICY "Public can view all avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'user-avatars');
