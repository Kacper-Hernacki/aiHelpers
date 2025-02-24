import axios from "axios";

const API_URL = "https://api.perplexity.ai/chat/completions";
const API_KEY = process.env.PERPLEXITY_API_KEY;

const headers = {
  accept: "application/json",
  "content-type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

const data = {
  model: "sonar-pro",
  messages: [
    {
      role: "system",
      content: "Be precise and concise.",
    },
    {
      role: "user",
      content:
        "Find me flights next week from Warsaw Chopin to JFK, the lowest prices possible",
    },
  ],
};

async function getPerplexityChatCompletion() {
  try {
    const response = await axios.post(API_URL, data, { headers });
    console.log(response.data);
  } catch (error) {
    console.error("Error fetching chat completion:", error);
  }
}

export default getPerplexityChatCompletion;
