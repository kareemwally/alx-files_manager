import express from 'express';
import routes from './routes/index.js';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 5000;

app.use('/', routes);
app.use(bodyParser.json());


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
