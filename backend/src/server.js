require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');

const port = process.env.PORT || 5000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`DK Industry API running at http://localhost:${port}`)))
  .catch(error => { console.error('Cannot connect to MongoDB:', error.message); process.exit(1); });
