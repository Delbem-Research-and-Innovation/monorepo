import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const path = req.query.path as string;
    await res.revalidate(path);
    return res.json({ revalidated: true });
  } catch (err) {
    return res.status(500).send('Error revalidating');
  }
};
