import { supabase } from '../../config/supabase';
import type { StorageBucket, GetUploadUrlResult } from './storage.types';
import { RECEIPT_BUCKET, AVATAR_BUCKET } from './storage.constant';

export const buildReceiptPath = (params: {
  userId: number;
  registrationId: number;
  fileName: string;
}): string =>
  `${RECEIPT_BUCKET}/${params.userId}/${params.registrationId}/${Date.now()}-${params.fileName}`;

export const buildAvatarPath = (params: {
  userId: number;
  fileName: string;
}): string =>
  `${AVATAR_BUCKET}/${params.userId}/${Date.now()}-${params.fileName}`;

export const getReceiptUploadUrl = async (params: {
  path: string;
}): Promise<GetUploadUrlResult> => {
  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUploadUrl(params.path);

  if (error) throw new Error(error.message);
  if (!data?.signedUrl || !data?.token) throw new Error(`Supabase returned empty signed URL: ${JSON.stringify(data)}`);

  return { uploadUrl: data.signedUrl, token: data.token, path: params.path };
};

export const getAvatarUploadUrl = async (params: {
  path: string;
}): Promise<GetUploadUrlResult> => {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(params.path);

  if (error) throw new Error(error.message);

  return { uploadUrl: data.signedUrl, token: data.token, path: params.path };
};

export const getReceiptSignedUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw new Error(error.message);

  return data.signedUrl;
};

export const getAvatarPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const verifyFileExists = async (params: {
  bucket: StorageBucket;
  path: string;
}): Promise<boolean> => {
  const lastSlash = params.path.lastIndexOf('/');
  const folder = params.path.substring(0, lastSlash);
  const fileName = params.path.substring(lastSlash + 1);

  const { data, error } = await supabase.storage.from(params.bucket).list(folder);

  if (error) return false;

  return data.some((file) => file.name === fileName);
};

export const deleteFile = async (params: { bucket: StorageBucket; path: string }): Promise<void> => {
  const { error } = await supabase.storage.from(params.bucket).remove([params.path]);

  if (error) {
    console.error('Storage deleteFile error:', error.message);
  }
};
