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
    console.log(docs);
    return {
      transcript: docs[0].pageContent,
      title: docs[0].metadata.title,
      author: docs[0].metadata.author,
      url: url,
      id: docs[0].metadata.source,
    };
  } catch (error) {
    throw error;
  }
}
