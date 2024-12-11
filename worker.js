import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db.js';

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  
  if (!userId) {
    throw new Error('Missing userId');
  }

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({ 
    _id: new dbClient.ObjectId(fileId), 
    userId: new dbClient.ObjectId(userId) 
  });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  
  for (const width of sizes) {
    const thumbnail = await imageThumbnail(file.localPath, { width });
    const thumbnailPath = `${file.localPath}_${width}`;
    await fs.promises.writeFile(thumbnailPath, thumbnail);
  }
});

export default fileQueue;
