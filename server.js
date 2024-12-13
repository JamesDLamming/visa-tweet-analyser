import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { handler as cronHandler } from "./api/cron.js";

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Mount the cron endpoint
app.post("/api/cron", cronHandler);

app.listen(port, () => {
  console.log(`API Server running at http://localhost:${port}`);
});
