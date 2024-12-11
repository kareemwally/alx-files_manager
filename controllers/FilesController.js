import Bull from 'bull';
const fileQueue = new Bull('fileQueue');

// Inside postUpload method, after saving the file:
if (type === 'image') {
  await fileQueue.add({
    userId: userId.toString(),
    fileId: result.insertedId.toString()
  });
}

// Update getFile method:
static async getFile(req, res) {
  const { id } = req.params;
  const { size } = req.query;
  const token = req.headers['x-token'];

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({ _id: new dbClient.ObjectId(id) });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file.isPublic) {
    if (!token) {
      return res.status(404).json({ error: 'Not found' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId || userId !== file.userId.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  if (file.type === 'folder') {
    return res.status(400).json({ error: "A folder doesn't have content" });
  }

  let filePath = file.localPath;
  if (size && ['500', '250', '100'].includes(size)) {
    filePath = `${file.localPath}_${size}`;
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const mimeType = mime.lookup(file.name);
  res.setHeader('Content-Type', mimeType);
  return res.sendFile(filePath);
}
