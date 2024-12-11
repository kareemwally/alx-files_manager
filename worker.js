import Bull from 'bull';
import dbClient from './utils/db.js';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({ _id: new dbClient.ObjectId(fileId), userId: new dbClient.ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

  for (const size of sizes) {
    const options = { width: size };
    const thumbnail = await imageThumbnail(file.localPath, options);
    const thumbnailPath = path.join(folderPath, `${path.basename(file.localPath)}_${size}`);
    fs.writeFileSync(thumbnailPath, thumbnail);
  }

  done();
});
