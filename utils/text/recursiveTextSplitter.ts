import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

interface SplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export async function splitDocuments(
  text: string,
  options: SplitterOptions = {}
): Promise<Document[]> {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = ["\n\n", "\n", " ", ""],
  } = options;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });

  try {
    const splitDocs = await splitter.splitDocuments([
      new Document({ pageContent: text }),
    ]);

    console.log(splitDocs[0].pageContent[0]);
    return splitDocs;
  } catch (error) {
    console.error("Error splitting documents:", error);
    throw error;
  }
}
