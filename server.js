import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is missing from .env");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const conversations = new Map();

const NOVA_PERSONALITY = `
You are NOVA, a personal AI secretary and companion.

Speak naturally, warmly, calmly, and conversationally.
Be intelligent, friendly, helpful, and concise for normal voice conversations.

Remember the current conversation and use previous messages naturally.
The user can talk with you about everyday life, work, business,
ideas, plans, technology, and general questions.

Do not sound robotic.
Do not pretend to be human.
Your name is NOVA.
`;

app.post("/api/chat", async (req, res) => {
    try {
        const {
            message,
            sessionId = "default"
        } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                error: "Message is required."
            });
        }

        let history = conversations.get(sessionId) || [];

        history.push({
            role: "user",
            content: message
        });

        history = history.slice(-20);

        const response = await openai.responses.create({
            model: "gpt-6-luna",

            instructions: NOVA_PERSONALITY,

            input: history
        });

        const reply =
            response.output_text ||
            "Sorry, I couldn't generate a response.";

        history.push({
            role: "assistant",
            content: reply
        });

        conversations.set(
            sessionId,
            history.slice(-20)
        );

        res.json({
            reply: reply
        });

    } catch (error) {
        console.error("NOVA ERROR:", error);

        res.status(500).json({
            error: "NOVA AI connection failed."
        });
    }
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        assistant: "NOVA"
    });
});

app.listen(PORT, () => {
    console.log("");
    console.log("===============================");
    console.log("       NOVA AI IS ONLINE");
    console.log("===============================");
    console.log("");
    console.log(`Open: http://localhost:${PORT}`);
    console.log("");
});

// ==========================================
// NOVA PUBLIC SUPABASE CONFIG
// ==========================================

app.get("/api/config", (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey =
        process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
        return res.status(500).json({
            error: "Supabase configuration is missing."
        });
    }

    res.json({
        supabaseUrl,
        supabasePublishableKey
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        assistant: "NOVA"
    });
});