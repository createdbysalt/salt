-- Create storage bucket for user avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-assets',
  'user-assets',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Set up storage policies for user-assets bucket
-- Allow authenticated users to upload their own avatars
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to update their own avatars
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to delete their own avatars
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public read access to avatars
create policy "Anyone can view avatars"
on storage.objects for select
to public
using (bucket_id = 'user-assets');

