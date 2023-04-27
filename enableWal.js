const { PrismaClient } = require("@prisma/client");

let client = new PrismaClient();

client.$queryRaw`PRAGMA journal_mode = WAL;`
  .then(() => {
    console.log("ENABLED WAL MODE FOR DATABASE");
  })
  .catch((err) => {
    console.log("DB SETUP FAILED", err);
    process.exit(1);
  });
