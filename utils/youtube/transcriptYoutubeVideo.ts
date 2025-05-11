import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { openaiService } from "../../services/openai/openai.service";
interface YoutubeTranscript {
  transcript: string;
  title: string;
  author: string;
  id: string;
  url: string;
}

export async function transcriptYoutubeVideo(
  url: string,
  language?: string
): Promise<YoutubeTranscript> {
  try {
    const loader = YoutubeLoader.createFromUrl(url, {
      language: language || "en",
      addVideoInfo: true,
    });
    const docs = await loader.load();

    // Extract video ID from URL if not available in metadata
    const videoId =
      docs[0].metadata.source || url.split("v=")[1]?.split("&")[0] || url;
    
    // Get the transcript
    const transcript = docs[0].pageContent;
    
    // Use OpenAI to extract author and title from transcript
    const metadata = await openaiService.extractVideoMetadata(transcript);
    
    // Use extracted metadata if available, otherwise fallback to YouTube metadata
    const title = 
      metadata.title !== "Untitled Video" ? metadata.title : 
      (docs[0].metadata.title || "Untitled Video");
      
    const author = 
      metadata.author !== "Unknown Author" ? metadata.author : 
      (docs[0].metadata.author || "Unknown Author");

    return {
      transcript,
      title,
      author,
      url,
      id: videoId,
    };
  } catch (error) {
    throw error;
  }
}
