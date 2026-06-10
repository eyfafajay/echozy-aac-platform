import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function handleTtsRequest(req, res) {
  try {
    const { text, language } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required." });
    }

    const isMalay = language === "ms-MY";

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text.trim(),
      instructions: isMalay
        ? "Speak in natural Bahasa Melayu Malaysia with a clear, warm, patient-friendly tone."
        : "Speak in natural English with a clear, warm, patient-friendly tone.",
      response_format: "mp3"
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate speech."
    });
  }
}

app.post("/tts", handleTtsRequest);
app.post("/api/tts", handleTtsRequest);

app.listen(port, () => {
  console.log(`TTS server running on http://localhost:${port}`);
});