import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(request, response) {
    const resObj = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return response.status(200).send(resObj);
  }

  static async getStats(request, response) {
    const resObj = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    return response.status(200).send(resObj);
  }
}

export default AppController;
