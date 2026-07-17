import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, data } = req.body;
  const logDir = path.join(process.cwd(), 'public');
  const logPath = path.join(logDir, 'debug-10752.log');

  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;

  try {
    fs.appendFileSync(logPath, logLine, 'utf-8');
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write log' });
  }
}
