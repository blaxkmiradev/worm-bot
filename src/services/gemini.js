const { GoogleGenerativeAI } = require("@google/generative-ai");
const systemPrompt = require("../config/prompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: systemPrompt.content,
});

/**
 * Send a message with chat history and get a reply from WormBot.
 * @param {Array} history - Array of {role, parts} objects (Gemini format)
 * @param {string} message - Latest user message
 * @returns {string} - Model reply text
 */
async function chat(history, message) {
  const chatSession = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.85,
    },
  });

  const result = await chatSession.sendMessage(message);
  return result.response.text();
}

module.exports = { chat };
