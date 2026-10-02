require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDatabase = require('./config/database');
const { runMaintenance } = require('./services/maintenanceService');
const { transactionsRequired } = require('./services/transactionService');
const { initializeChatGateway } = require('./realtime/chatGateway');

const port = process.env.PORT || 5000;
connectDatabase()
  .then(async () => {
    if (transactionsRequired()) {
      const hello = await require('mongoose').connection.db.admin().command({ hello: 1 });
      if (!hello.setName && !hello.msg?.includes('isdbgrid')) throw new Error('Production requires a MongoDB replica set or sharded cluster for transactional writes');
    }
    const server = http.createServer(app);
    initializeChatGateway(server);
    server.listen(port, () => console.log(`DK Industry API running at http://localhost:${port}`));
    const maintenanceTimer = setInterval(() => runMaintenance().catch(error => console.error('Maintenance failed:', error.message)), 15 * 60 * 1000);
    maintenanceTimer.unref();
    runMaintenance().catch(error => console.error('Initial maintenance failed:', error.message));
    return server;
  })
  .catch(error => { console.error('Cannot connect to MongoDB:', error.message); process.exit(1); });
