import express from "express";
import cors from "cors";
// In-memory mode
import { router } from "./routes";
const app = express();
app.use(cors());
app.use(express.json());

app.use(router);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
