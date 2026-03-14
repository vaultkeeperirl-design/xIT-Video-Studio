import { renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

test('uploadAsset should handle files without a name gracefully', async () => {
  const { result } = renderHook(() => useProject());

  // Create a Blob and cast it as unknown as File to avoid 'any'
  const malformedFile = new Blob(['123'], { type: 'video/mp4' }) as unknown as File;
  Object.defineProperty(malformedFile, 'name', { value: undefined });

  await expect(result.current.uploadAsset(malformedFile)).rejects.toThrow('File must have a name');
});
