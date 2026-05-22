/**
 * Unit tests for the revalidate API handler (P5 — 4 cases).
 *
 * Test plan:
 *  1. Happy path  — handler resolves; res.json({ revalidated: true }) called.
 *  2. Happy path  — different path; res.json({ revalidated: true }) called.
 *  3. Error path  — res.revalidate throws; res.status(500).send('Error revalidating') called.
 *  4. Contract    — res.revalidate called exactly once with the correct path.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from 'src/pages/api/revalidate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRes = (revalidateImpl?: () => Promise<void>) => {
  const send = jest.fn();
  const status = jest.fn().mockReturnValue({ send });
  const json = jest.fn();
  const revalidate = jest.fn().mockImplementation(
    revalidateImpl ??
      (() => {
        return Promise.resolve();
      })
  );

  return { revalidate, json, status, send } as unknown as NextApiResponse & {
    revalidate: jest.Mock;
    json: jest.Mock;
    status: jest.Mock;
    send: jest.Mock;
  };
};

const makeReq = (path: string) => {
  return { query: { path } } as unknown as NextApiRequest;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('revalidate API handler', () => {
  // Case 1 — Happy path with /p/multimapas
  test('Case 1: happy path — res.json({ revalidated: true }) called for /p/multimapas', async () => {
    const req = makeReq('/p/multimapas');
    const res = makeRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ revalidated: true });
    expect(res.status).not.toHaveBeenCalled();
  });

  // Case 2 — Happy path with a different path
  test('Case 2: happy path — res.json({ revalidated: true }) called for /p/outro-projeto', async () => {
    const req = makeReq('/p/outro-projeto');
    const res = makeRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ revalidated: true });
    expect(res.status).not.toHaveBeenCalled();
  });

  // Case 3 — Error path: res.revalidate throws
  test('Case 3: res.revalidate throws → res.status(500).send("Error revalidating")', async () => {
    const req = makeReq('/p/multimapas');
    const res = makeRes(() => {
      throw new Error('revalidate failed');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Error revalidating');
    expect(res.json).not.toHaveBeenCalled();
  });

  // Case 4 — Contract: res.revalidate called exactly once with the correct path
  test('Case 4: res.revalidate called exactly once with the path from req.query', async () => {
    const req = makeReq('/p/multimapas');
    const res = makeRes();

    await handler(req, res);

    expect(res.revalidate).toHaveBeenCalledTimes(1);
    expect(res.revalidate).toHaveBeenCalledWith('/p/multimapas');
  });
});
