import { ObjectID } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import Queue from 'bull';
import dbClient from '../utils/db';
import {
  checkAuth, findFile, sanitizeReturnObj, findAndUpdateFile,
  aggregateAndPaginate, checkFileAndReadContents, getFileCheckAuth,
} from '../utils/helpers';

class FilesController {
  static async postUpload(request, response) {
    const fileQueue = new Queue('fileQueue');
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const { name, type, data } = request.body;
    let { parentId, isPublic } = request.body;
    let resultObj;

    if (!name) return response.status(400).json({ error: 'Missing name' });
    if (!type || ['folder', 'file', 'image'].indexOf(type) === -1) return response.status(400).json({ error: 'Missing type' });
    if (!parentId) parentId = 0;
    else {
      const parentFileArray = await dbClient.files.find({ _id: ObjectID(parentId) }).toArray();
      if (parentFileArray.length === 0) return response.status(400).json({ error: 'Parent not found' });

      const file = parentFileArray[0];
      if (file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' });
    }
    if (!isPublic) isPublic = false;
    if (!data && type !== 'folder') return response.status(400).json({ error: 'Missing data' });
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

      const fileNameUUID = uuidv4();
      const localPath = `${folderPath}/${fileNameUUID}`;
      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData.toString(), { flag: 'w+' });
      resultObj = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath,
      });
      if (type === 'image') {
        await fs.promises.writeFile(localPath, clearData, { flag: 'w+', encoding: 'binary' });
        await fileQueue.add({ userId, fileId: resultObj.insertedId, localPath });
      }
    } else {
      resultObj = await dbClient.files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
      });
    }
    return response.status(201).json({
      id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId,
    });
  }

  static async getShow(request, response) {
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const file = await findFile(request, response, dbClient.files, userId);
    if (!file) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder' && file.userId.toString() !== userId.toString()) return response.status(404).json({ error: 'Not found' });
    return sanitizeReturnObj(response, file, userId);
  }

  static async getIndex(request, response) {
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const { parentId } = request.query || 0;
    const searcherTerm = parentId === undefined ? 'userId' : 'parentId';
    const searcherValue = parentId === undefined ? userId : parentId;
    const { page } = request.query || 0;
    return aggregateAndPaginate(response, dbClient.files, page, searcherTerm, searcherValue);
  }

  static async putPublish(request, response) {
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const file = await findAndUpdateFile(request, response, dbClient.files, userId, true);
    if (!file) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder' && file.userId.toString() !== userId.toString()) return response.status(404).json({ error: 'Not found' });
    return sanitizeReturnObj(response, file, userId);
  }

  static async putUnpublish(request, response) {
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const file = await findAndUpdateFile(request, response, dbClient.files, userId, false);
    if (!file) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder' && file.userId.toString() !== userId.toString()) return response.status(404).json({ error: 'Not found' });
    return sanitizeReturnObj(response, file, userId);
  }

  static async getFile(request, response) {
    const token = request.headers['x-token'];
    const { size } = request.query;
    const userId = await getFileCheckAuth(request);
    const file = await findFile(request, response, dbClient.files, userId);
    if (!file) return response.status(404).json({ error: 'Not found' });
    return checkFileAndReadContents(response, file, token, userId, size);
  }
}

export default FilesController;
