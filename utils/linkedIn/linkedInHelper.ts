//? Under development
import axios from "axios";

let accessToken: string | null = null;

async function authenticate(): Promise<void> {
  try {
    const response = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "client_credentials",
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
      }
    );
    accessToken = response.data.access_token;
  } catch (error) {
    console.error("LinkedIn authentication failed:", error);
    throw new Error("Failed to authenticate with LinkedIn");
  }
}

function extractPostId(postUrl: string): string {
  const match = postUrl.match(/(?:activity|ugcPost)-(\d+)/);
  return match ? match[1] : "";
}

export async function getPostContent(postUrl: string): Promise<string> {
  if (!accessToken) {
    await authenticate();
  }

  const postId = extractPostId(postUrl);
  const apiUrl = `https://api.linkedin.com/v2/ugcPosts/${postId}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202301",
      },
    });
    return response.data.specificContent.com.linkedin.ugc.ShareContent
      .shareCommentary.text;
  } catch (error) {
    console.error("Failed to fetch LinkedIn post content:", error);
    throw new Error("Failed to fetch LinkedIn post content");
  }
}
