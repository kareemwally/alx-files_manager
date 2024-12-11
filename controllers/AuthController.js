import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import { checkAuthReturnKey, findUserByCreds, credsFromBasicAuth } from '../utils/helpers';

class AuthController {
  static async getConnect(request, response) {
    const creds = await credsFromBasicAuth(request);
    if (!creds) return response.status(401).json({ error: 'Unauthorized' });
    const user = await findUserByCreds(creds.email, creds.password);
    if (!user) return response.status(401).json({ error: 'Unauthorized' });
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    return response.json({ token });
  }

  static async getDisconnect(request, response) {
    const key = await checkAuthReturnKey(request);
    if (!key) return response.status(401).json({ error: 'Unauthorized' });
    await redisClient.del(key);
    return response.status(204).end();
  }
}

export default AuthController;
