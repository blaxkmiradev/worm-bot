const { GoogleGenerativeAI } = require("@google/generative-ai");
const systemPrompt = require("../config/prompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Send a message with chat history and get a reply from WormBot.
 * @param {Array} history - Array of {role, parts} objects (Gemini format)
 * @param {string} message - Latest user message
 * @param {string} modelId - Model ID string
 * @param {Array} fileParts - Array of file parts
 * @returns {string} - Model reply text
 */
async function chat(history, message, modelId = "gemini-2.5-flash", fileParts = []) {
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: systemPrompt.content,
  });

  const chatSession = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.85,
    },
  });

  const requestPayload = fileParts.length > 0 ? [{ text: message }, ...fileParts] : message;
  const result = await chatSession.sendMessage(requestPayload);
  return result.response.text();
}

module.exports = { chat };
