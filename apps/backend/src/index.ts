import express from "express";
import cors from "cors";
// In-memory mode
import { router } from "./routes";
import { attachQuoteWSServer } from "./quotes";
import { createServer } from "http";

const app = express();
app.use(cors());
app.use(express.json());

app.use(router);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const server = createServer(app);
attachQuoteWSServer(server);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
