// services/openai/openai.service.ts
import { OpenAI } from "openai";

// Initialize OpenAI client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openaiService = {
  /**
   * Extract video metadata (author and title) from a transcript
   * @param transcript - The video transcript text
   * @returns Object containing author and title
   */
  extractVideoMetadata: async (transcript: string) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    try {
      // Use first 2000 characters for better context while still minimizing tokens
      const truncatedTranscript = transcript.substring(0, 2000);
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Your task is to accurately identify the video creator (narrator/presenter) and the video title by analyzing the transcript. Remember that:
1. The author is the person CREATING or PRESENTING the video, not people being discussed in the video
2. The person who introduces themselves with phrases like 'Hello, I'm X' or 'My name is X' is likely the author
3. Distinguish between the creator and subjects being discussed - if someone says 'Today we'll look at Jane's training routine', Jane is NOT the author
4. Look for self-references like 'In this video, I will show you'
5. Check for channel references like 'Welcome back to [Channel Name]'

Return ONLY JSON format with 'author' (presenter's name) and 'title' keys. If you cannot determine one or both with confidence, use 'Unknown' as value.`
          },
          {
            role: "user",
            content: truncatedTranscript
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{"author": "Unknown Author", "title": "Untitled Video"}');
      
      return {
        author: result.author || "Unknown Author",
        title: result.title || "Untitled Video"
      };
    } catch (error: any) {
      console.error("OpenAI API error:", error);
      // Return default values in case of error
      return {
        author: "Unknown Author",
        title: "Untitled Video"
      };
    }
  },

  /**
   * Analyze an image using OpenAI's Vision API
   * @param imageBuffer - The image buffer
   * @param mimeType - The MIME type of the image
   * @returns Analysis results including extracted text and image description
   */
  analyzeImage: async (imageBuffer: Buffer, mimeType: string) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Send to OpenAI API for analysis
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that analyzes images. Your task is to extract any visible text from images, identify social media platforms, and provide objective descriptions of their contents. Format your response exactly as:\n\nText: [extracted text - write N/A if no text is visible]\n\nSource: [name of social media platform or application if it's a screenshot of a post/content - write N/A if not identifiable]\n\nDescription: [objective description of visual elements]"
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please analyze this image and provide the following information:\n1. Extract any text visible in the image\n2. If this appears to be a screenshot from a social media platform or application (like Twitter/X, Facebook, Instagram, LinkedIn, TikTok, etc.), identify which platform it is\n3. Provide a brief, factual description of what's in the image\n\nIf any section is not applicable, write 'N/A' for that section." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });
      
      // Extract the response content
      const analysisResult = response.choices[0]?.message?.content || "No analysis returned";
      
      // Parse the response to extract text, source, and description
      let extractedText = "";
      let sourceIdentified = "";
      let imageDescription = "";
      
      // Extract text
      if (analysisResult.includes("Text:")) {
        const textPart = analysisResult.split("Text:")[1];
        extractedText = textPart.split("Source:")[0].trim();
        // If Source: isn't found, try to split by Description:
        if (!extractedText.includes("Source:") && textPart.includes("Description:")) {
          extractedText = textPart.split("Description:")[0].trim();
        }
      }
      
      // Extract source/platform
      if (analysisResult.includes("Source:")) {
        const sourcePart = analysisResult.split("Source:")[1];
        sourceIdentified = sourcePart.split("Description:")[0].trim();
      }
      
      // Extract description
      if (analysisResult.includes("Description:")) {
        imageDescription = analysisResult.split("Description:")[1].trim();
      } else {
        imageDescription = analysisResult;
      }
      
      return {
        fullAnalysis: analysisResult,
        extractedText,
        sourceIdentified,
        imageDescription
      };
    } catch (error: any) {
      console.error("OpenAI API error:", error);
      throw new Error(`Image analysis error: ${error.message}`);
    }
  }
};
