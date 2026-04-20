export type StorageBucket = 'receipt' | 'avatar';

export type GetUploadUrlResult = {
  uploadUrl: string;
  token: string;
  path: string;
};
