import crypto from 'crypto';
import Queue from 'bull';
import dbClient from '../utils/db';
import { checkAuth, findUserById } from '../utils/helpers';

class UsersController {
  static async postNew(request, response) {
    const userQueue = new Queue('userQueue');
    const { email, password } = request.body;
    if (!email) return response.status(400).json({ error: 'Missing email' });
    if (!password) return response.status(400).json({ error: 'Missing password' });

    const userExistsArray = await dbClient.users.find({ email }).toArray();
    if (userExistsArray.length > 0) return response.status(400).json({ error: 'Already exist' });

    const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
    const resultObj = await dbClient.users.insertOne({ email, password: hashedPassword });
    const createdUser = { id: resultObj.ops[0]._id, email: resultObj.ops[0].email };
    await userQueue.add({ userId: createdUser.id });
    return response.status(201).json(createdUser);
  }

  static async getMe(request, response) {
    const userId = await checkAuth(request);
    if (!userId) return response.status(401).json({ error: 'Unauthorized' });
    const user = await findUserById(userId);
    if (!user) return response.status(401).json({ error: 'Unauthorized' });
    return response.json({ id: user._id, email: user.email });
  }
}

export default UsersController;
