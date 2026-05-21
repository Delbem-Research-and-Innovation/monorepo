/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'node:path';

import { google } from 'googleapis';

const drive = google.drive('v3');

export const sheets = google.sheets('v4');

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

let _authClientPromise: Promise<any> | null = null;

export const getAuth = async () => {
  if (!_authClientPromise) {
    const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: path.join(process.cwd(), 'simple4decision-ff5d296826c0.json'),
    });
    _authClientPromise = auth.getClient() as Promise<any>;
  }

  return _authClientPromise;
};

type Folder = {
  id: string;
  name: string;
};

export const listAllFoldersInFolder = async ({
  auth,
  folderId,
  nextPageToken,
}: {
  auth: any;
  folderId: string;
  nextPageToken?: string;
}) => {
  const q = [
    `'${folderId}' in parents`,
    'trashed = false',
    "mimeType = 'application/vnd.google-apps.folder'",
  ].join(' and ');

  const folders: Folder[] = [];

  const response = await drive.files.list({
    auth,
    includeItemsFromAllDrives: true,
    q,
    supportsAllDrives: true,
    pageToken: nextPageToken,
  });

  if (response.data.files) {
    folders.push(
      ...response.data.files.map((file) => {
        return {
          id: file.id || '',
          name: file.name || '',
        };
      })
    );
  }

  if (response.data.nextPageToken) {
    const nextPageFiles = await listAllFoldersInFolder({
      auth,
      folderId,
      nextPageToken: response.data.nextPageToken,
    });

    folders.push(...nextPageFiles);
  }

  return folders;
};

type File = {
  kind: string;
  mimeType: string;
  id: string;
  name: string;
};

export const listAllSheetsInFolder = async ({
  auth,
  folderId,
  nextPageToken,
}: {
  auth: any;
  folderId: string;
  nextPageToken?: string;
}): Promise<File[]> => {
  const q = [
    `'${folderId}' in parents`,
    'trashed = false',
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
  ].join(' and ');

  const files: File[] = [];

  const response = await drive.files.list({
    auth,
    includeItemsFromAllDrives: true,
    q,
    supportsAllDrives: true,
    pageToken: nextPageToken,
  });

  if (response.data.files) {
    files.push(
      ...response.data.files.map((file) => {
        return {
          kind: file.kind || '',
          mimeType: file.mimeType || '',
          id: file.id || '',
          name: file.name || '',
        };
      })
    );
  }

  if (response.data.nextPageToken) {
    const nextPageFiles = await listAllSheetsInFolder({
      auth,
      folderId,
      nextPageToken: response.data.nextPageToken,
    });

    files.push(...nextPageFiles);
  }

  return files;
};
