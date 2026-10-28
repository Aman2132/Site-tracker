import { File } from 'expo-file-system';

import { deleteLocalFiles } from '@/services/localMediaService';

jest.mock('@/constants/config', () => ({ LOCAL_MEDIA: { captureDir: 'captures' } }));

const mockFiles = new Map<string, { exists: boolean; fail?: boolean }>();
const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs' },
  Directory: jest.fn(),
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    get exists() {
      return mockFiles.get(uri)?.exists ?? false;
    },
    delete() {
      if (mockFiles.get(uri)?.fail) throw new Error('permission denied');
      mockDelete(uri);
    },
  })),
}));

describe('deleteLocalFiles', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockDelete.mockClear();
    (File as unknown as jest.Mock).mockClear();
  });

  it('deletes files that exist and counts them', () => {
    mockFiles.set('file:///docs/a.jpg', { exists: true });
    mockFiles.set('file:///docs/b.jpg', { exists: true });

    expect(deleteLocalFiles(['file:///docs/a.jpg', 'file:///docs/b.jpg'])).toBe(2);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('skips a file that is already gone', () => {
    expect(deleteLocalFiles(['file:///docs/gone.jpg'])).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('leaves web addresses and empty entries alone', () => {
    expect(deleteLocalFiles(['https://cdn/a.jpg', undefined])).toBe(0);
    expect(File).not.toHaveBeenCalled();
  });

  it('deletes a file listed twice once', () => {
    mockFiles.set('file:///docs/a.jpg', { exists: true });

    expect(deleteLocalFiles(['file:///docs/a.jpg', 'file:///docs/a.jpg'])).toBe(1);
  });

  it('keeps going when one file cannot be deleted', () => {
    mockFiles.set('file:///docs/locked.jpg', { exists: true, fail: true });
    mockFiles.set('file:///docs/ok.jpg', { exists: true });

    expect(deleteLocalFiles(['file:///docs/locked.jpg', 'file:///docs/ok.jpg'])).toBe(1);
    expect(mockDelete).toHaveBeenCalledWith('file:///docs/ok.jpg');
  });
});
