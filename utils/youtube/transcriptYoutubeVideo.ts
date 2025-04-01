import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
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

    return {
      transcript: docs[0].pageContent,
      title: docs[0].metadata.title || "Untitled Video",
      author: docs[0].metadata.author || "Unknown Author",
      url: url,
      id: videoId,
    };
  } catch (error) {
    throw error;
  }
}
