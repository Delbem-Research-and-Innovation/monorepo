/**
 * Unit tests for google.ts — listAllFoldersInFolder & listAllSheetsInFolder
 *
 * Challenge: `drive` and `sheets` are singletons created at module-evaluation
 * time, so a hoisted `jest.mock` cannot intercept them. Solution: each
 * describe uses `jest.isolateModules` + `jest.doMock` inside `beforeEach` so
 * that every test gets a freshly-evaluated module with a controlled mock.
 *
 * Test plan (11 cases per function, 22 total):
 *  Query string (5): folderId in parents, trashed=false, mimeType, supportsAllDrives, includeItemsFromAllDrives
 *  Simple response (3): correct mapping, id-fallback, name-fallback
 *  Pagination (3): second call with pageToken, result aggregation, ordering
 */

// ---------------------------------------------------------------------------
// listAllFoldersInFolder
// ---------------------------------------------------------------------------

describe('listAllFoldersInFolder', () => {
  const mockFilesList = jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listAllFoldersInFolder: (args: any) => Promise<any[]>;

  beforeEach(() => {
    mockFilesList.mockReset();
    jest.isolateModules(() => {
      jest.doMock('googleapis', () => {
        return {
          google: {
            drive: () => {
              return { files: { list: mockFilesList } };
            },
            sheets: () => {
              return {
                spreadsheets: { get: jest.fn(), values: { get: jest.fn() } },
              };
            },
            auth: { GoogleAuth: jest.fn() },
          },
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ listAllFoldersInFolder } = require('src/google'));
    });
  });

  const auth = {};
  const folderId = 'folder-123';

  // --- Query string ---

  test('Case 1: query includes folderId in parents — "\'folder-123\' in parents"', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllFoldersInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain(`'${folderId}' in parents`);
  });

  test('Case 2: query includes trashed = false', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllFoldersInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain('trashed = false');
  });

  test("Case 3: query includes mimeType = 'application/vnd.google-apps.folder'", async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllFoldersInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain("mimeType = 'application/vnd.google-apps.folder'");
  });

  test('Case 4: supportsAllDrives is true', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllFoldersInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.supportsAllDrives).toBe(true);
  });

  test('Case 5: includeItemsFromAllDrives is true', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllFoldersInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.includeItemsFromAllDrives).toBe(true);
  });

  // --- Simple response (no pagination) ---

  test('Case 6: returns files mapped to {id, name}', async () => {
    mockFilesList.mockResolvedValue({
      data: {
        files: [
          { id: 'id-1', name: 'Folder One' },
          { id: 'id-2', name: 'Folder Two' },
        ],
      },
    });

    const result = await listAllFoldersInFolder({ auth, folderId });

    expect(result).toEqual([
      { id: 'id-1', name: 'Folder One' },
      { id: 'id-2', name: 'Folder Two' },
    ]);
  });

  test('Case 7: fallback to empty string when id is undefined', async () => {
    mockFilesList.mockResolvedValue({
      data: { files: [{ id: undefined, name: 'No Id' }] },
    });

    const result = await listAllFoldersInFolder({ auth, folderId });

    expect(result[0].id).toBe('');
  });

  test('Case 8: fallback to empty string when name is undefined', async () => {
    mockFilesList.mockResolvedValue({
      data: { files: [{ id: 'id-x', name: undefined }] },
    });

    const result = await listAllFoldersInFolder({ auth, folderId });

    expect(result[0].name).toBe('');
  });

  // --- Pagination ---

  test('Case 9: makes a second call with pageToken when nextPageToken is present', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: { nextPageToken: 'token-abc', files: [{ id: 'p1', name: 'F1' }] },
      })
      .mockResolvedValueOnce({
        data: { files: [{ id: 'p2', name: 'F2' }] },
      });

    await listAllFoldersInFolder({ auth, folderId });

    expect(mockFilesList).toHaveBeenCalledTimes(2);
    const secondCall = mockFilesList.mock.calls[1][0];
    expect(secondCall.pageToken).toBe('token-abc');
  });

  test('Case 10: aggregates results from multiple pages', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: { nextPageToken: 'token-abc', files: [{ id: 'p1', name: 'F1' }] },
      })
      .mockResolvedValueOnce({
        data: { files: [{ id: 'p2', name: 'F2' }] },
      });

    const result = await listAllFoldersInFolder({ auth, folderId });

    expect(result.length).toBe(2);
    const ids = result.map((r) => {
      return r.id;
    });
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
  });

  /**
   * Case 11 — ordering.
   *
   * Page 1 items MUST appear before Page 2 items in the final array.
   * Regression guard for the ordering fix in listAllFoldersInFolder:
   * current page files are pushed before the recursive next-page call.
   */
  test('Case 11: Page 1 results come before Page 2 results', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: {
          nextPageToken: 'token-abc',
          files: [{ id: 'page1-item', name: 'Page 1' }],
        },
      })
      .mockResolvedValueOnce({
        data: { files: [{ id: 'page2-item', name: 'Page 2' }] },
      });

    const result = await listAllFoldersInFolder({ auth, folderId });

    expect(result[0].name).toBe('Page 1');
    expect(result[1].name).toBe('Page 2');
  });
});

// ---------------------------------------------------------------------------
// listAllSheetsInFolder
// ---------------------------------------------------------------------------

describe('listAllSheetsInFolder', () => {
  const mockFilesList = jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listAllSheetsInFolder: (args: any) => Promise<any[]>;

  beforeEach(() => {
    mockFilesList.mockReset();
    jest.isolateModules(() => {
      jest.doMock('googleapis', () => {
        return {
          google: {
            drive: () => {
              return { files: { list: mockFilesList } };
            },
            sheets: () => {
              return {
                spreadsheets: { get: jest.fn(), values: { get: jest.fn() } },
              };
            },
            auth: { GoogleAuth: jest.fn() },
          },
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ listAllSheetsInFolder } = require('src/google'));
    });
  });

  const auth = {};
  const folderId = 'folder-456';

  // --- Query string ---

  test('Case 1: query includes folderId in parents — "\'folder-456\' in parents"', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllSheetsInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain(`'${folderId}' in parents`);
  });

  test('Case 2: query includes trashed = false', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllSheetsInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain('trashed = false');
  });

  test("Case 3: query includes mimeType = 'application/vnd.google-apps.spreadsheet'", async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllSheetsInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.q).toContain(
      "mimeType = 'application/vnd.google-apps.spreadsheet'"
    );
  });

  test('Case 4: supportsAllDrives is true', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllSheetsInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.supportsAllDrives).toBe(true);
  });

  test('Case 5: includeItemsFromAllDrives is true', async () => {
    mockFilesList.mockResolvedValue({ data: { files: [] } });

    await listAllSheetsInFolder({ auth, folderId });

    const call = mockFilesList.mock.calls[0][0];
    expect(call.includeItemsFromAllDrives).toBe(true);
  });

  // --- Simple response (no pagination) ---

  test('Case 6: returns files mapped to {kind, mimeType, id, name}', async () => {
    mockFilesList.mockResolvedValue({
      data: {
        files: [
          {
            kind: 'drive#file',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            id: 'sheet-1',
            name: 'Sheet One',
          },
        ],
      },
    });

    const result = await listAllSheetsInFolder({ auth, folderId });

    expect(result).toEqual([
      {
        kind: 'drive#file',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        id: 'sheet-1',
        name: 'Sheet One',
      },
    ]);
  });

  test('Case 7: fallback to empty string when id is undefined', async () => {
    mockFilesList.mockResolvedValue({
      data: {
        files: [
          {
            kind: 'drive#file',
            mimeType: 'application/vnd.google-apps.spreadsheet',
            id: undefined,
            name: 'No Id',
          },
        ],
      },
    });

    const result = await listAllSheetsInFolder({ auth, folderId });

    expect(result[0].id).toBe('');
  });

  test('Case 8: fallback to empty string when name, kind, and mimeType are undefined', async () => {
    mockFilesList.mockResolvedValue({
      data: {
        files: [
          { kind: undefined, mimeType: undefined, id: 'id-y', name: undefined },
        ],
      },
    });

    const result = await listAllSheetsInFolder({ auth, folderId });

    expect(result[0].name).toBe('');
    expect(result[0].kind).toBe('');
    expect(result[0].mimeType).toBe('');
  });

  // --- Pagination ---

  test('Case 9: makes a second call with pageToken when nextPageToken is present', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: {
          nextPageToken: 'token-xyz',
          files: [
            {
              kind: 'drive#file',
              mimeType: 'application/vnd.google-apps.spreadsheet',
              id: 's1',
              name: 'S1',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          files: [
            {
              kind: 'drive#file',
              mimeType: 'application/vnd.google-apps.spreadsheet',
              id: 's2',
              name: 'S2',
            },
          ],
        },
      });

    await listAllSheetsInFolder({ auth, folderId });

    expect(mockFilesList).toHaveBeenCalledTimes(2);
    const secondCall = mockFilesList.mock.calls[1][0];
    expect(secondCall.pageToken).toBe('token-xyz');
  });

  test('Case 10: aggregates results from multiple pages', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: {
          nextPageToken: 'token-xyz',
          files: [
            {
              kind: 'k',
              mimeType: 'mt',
              id: 's1',
              name: 'S1',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          files: [
            {
              kind: 'k',
              mimeType: 'mt',
              id: 's2',
              name: 'S2',
            },
          ],
        },
      });

    const result = await listAllSheetsInFolder({ auth, folderId });

    expect(result.length).toBe(2);
    const ids = result.map((r) => {
      return r.id;
    });
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
  });

  /**
   * Case 11 — ordering.
   */
  test('Case 11: Page 1 results come before Page 2 results', async () => {
    mockFilesList
      .mockResolvedValueOnce({
        data: {
          nextPageToken: 'token-xyz',
          files: [
            { kind: 'k', mimeType: 'mt', id: 'page1-sheet', name: 'Page 1' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          files: [
            { kind: 'k', mimeType: 'mt', id: 'page2-sheet', name: 'Page 2' },
          ],
        },
      });

    const result = await listAllSheetsInFolder({ auth, folderId });

    expect(result[0].name).toBe('Page 1');
    expect(result[1].name).toBe('Page 2');
  });
});
