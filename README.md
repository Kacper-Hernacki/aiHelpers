# aiHelpers

aiHelpers is a comprehensive API service built with Node.js/Express that provides various helper utilities including file management, image analysis, video transcription, and more.

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

For database setup:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Environment Variables

Create a `.env.local` file (for development) or `.env.production` (for production) with the following variables:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
API_KEY="YOUR_API_KEY"
NODE_ENV="development" # or "production"

# OpenAI API
OPENAI_API_KEY="your_openai_api_key"

# DigitalOcean Spaces (S3 Compatible Storage)
DO_SPACES_ENDPOINT="your_spaces_endpoint" # e.g. fra1.digitaloceanspaces.com
DO_SPACES_REGION="your_spaces_region" # e.g. fra1
DO_SPACES_ACCESS_KEY="your_spaces_access_key"
DO_SPACES_SECRET_KEY="your_spaces_secret_key"

# ComfyICU API
COMFYICU_API_KEY="your_comfyicu_api_key"
COMFYUI_SERVER_ADDRESS="your_comfyui_server_address" # e.g. 127.0.0.1:8188
```

## API Documentation

This section describes all available API endpoints in the aiHelpers service.

### File Management

#### Upload a File
- **Endpoint**: `POST /file/upload`
- **Content-Type**: `multipart/form-data`
- **Request Body**: 
  - `file`: The file to upload (required)
- **Response**: 
  ```json
  {
    "success": true,
    "message": "File uploaded successfully",
    "data": {
      "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename.ext",
      "originUrl": "https://bucket-name.endpoint/filename.ext",
      "filename": "unique-filename.ext",
      "originalName": "original-filename.ext",
      "size": 12345,
      "etag": "etag-value"
    }
  }
  ```
- **Description**: Uploads a file to Digital Ocean Spaces storage and returns URLs to access it.

#### Upload Multiple Files
- **Endpoint**: `POST /file/upload-multiple`
- **Content-Type**: `multipart/form-data`
- **Request Body**: 
  - `files`: Multiple files to upload (use the same field name for all files)
- **Response**: 
  ```json
  {
    "success": true,
    "files": [
      {
        "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename1.ext",
        "originUrl": "https://bucket-name.endpoint/filename1.ext",
        "filename": "unique-filename1.ext",
        "originalName": "original-filename1.ext",
        "size": 12345,
        "etag": "etag-value1"
      },
      {
        "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename2.ext",
        "originUrl": "https://bucket-name.endpoint/filename2.ext",
        "filename": "unique-filename2.ext",
        "originalName": "original-filename2.ext",
        "size": 67890,
        "etag": "etag-value2"
      }
    ]
  }
  ```
- **Description**: Uploads multiple files to Digital Ocean Spaces storage in a single request and returns URLs to access them. Use the same field name `files` for all files in the form-data request.

#### Get File Information
- **Endpoint**: `GET /file/info/:filename`
- **URL Parameters**: 
  - `filename`: The name of the file to get information about
- **Response**: Information about the file including its metadata
- **Description**: Retrieves metadata for a specific file from Digital Ocean Spaces.

#### Download File
- **Endpoint**: `GET /file/download/:filename`
- **URL Parameters**: 
  - `filename`: The name of the file to download
- **Response**: The file content or a download link
- **Description**: Downloads or streams a file directly from Digital Ocean Spaces.

### Image Analysis

#### Analyze Image
- **Endpoint**: `POST /image/analyze-image`
- **Content-Type**: `multipart/form-data`
- **Request Body**: 
  - `image`: The image file to analyze (required)
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "Image uploaded and analyzed successfully",
    "data": {
      "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename.ext",
      "originUrl": "https://bucket-name.endpoint/filename.ext",
      "filename": "unique-filename.ext",
      "originalName": "original-filename.ext",
      "size": 12345,
      "etag": "etag-value",
      "analysis": {
        "fullAnalysis": "Complete analysis text",
        "extractedText": "Text extracted from the image",
        "sourcePlatform": "Identified social media platform or source",
        "imageDescription": "Detailed description of the image"
      }
    }
  }
  ```
- **Description**: Uploads an image to Digital Ocean Spaces, analyzes it with OpenAI's GPT-4o model to extract text, identify the social media platform (if applicable), and provide a description.

#### Analyze Multiple Images
- **Endpoint**: `POST /image/analyze-multiple-images`
- **Content-Type**: `multipart/form-data`
- **Request Body**: 
  - `images`: Multiple image files to analyze (use the same field name for all files)
- **Response**: 
  ```json
  {
    "status": "success",
    "message": "3 images analyzed successfully",
    "data": {
      "files": [
        {
          "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename1.ext",
          "originUrl": "https://bucket-name.endpoint/filename1.ext",
          "filename": "unique-filename1.ext",
          "originalName": "original-filename1.ext",
          "size": 12345,
          "etag": "etag-value1"
        },
        { ... }
      ],
      "analysis": {
        "individualResults": [
          {
            "fullAnalysis": "Complete analysis text for image 1",
            "extractedText": "Text extracted from image 1",
            "sourceIdentified": "LinkedIn",
            "imageDescription": "Description of image 1",
            "originalName": "filename1.ext",
            "url": "https://bucket-name.region.cdn.digitaloceanspaces.com/filename1.ext"
          },
          { ... }
        ],
        "consolidated": {
          "platform": "LinkedIn",
          "extractedText": "Deduplicated text extracted from all images"
        }
      }
    }
  }
  ```
- **Description**: Uploads multiple images to Digital Ocean Spaces, analyzes each with OpenAI's GPT-4o model and consolidates the results. This endpoint is especially useful for analyzing multi-image screenshots of the same post (e.g., from LinkedIn) where text might be duplicated across images. The response includes individual analysis results for each image plus a consolidated result with deduplicated text.

### YouTube

#### Get YouTube Transcript
- **Endpoint**: `POST /youtube/transcript`
- **Content-Type**: `application/json`
- **Request Body**: 
  - `videoUrl` or `videoId`: URL or ID of the YouTube video
- **Response**: Transcript text from the YouTube video
- **Description**: Extracts and returns the transcript from a YouTube video.

### Notes

#### Add YouTube Notes
- **Endpoint**: `POST /notes/add/youtube`
- **Content-Type**: `application/json`
- **Request Body**: Data related to YouTube video for note creation
- **Response**: Created note information
- **Description**: Creates notes from YouTube video content, typically using the transcript.

### Notion Integration

#### Get Vacation Calendar
- **Endpoint**: `GET /notion/calendar/vacation`
- **Response**: Calendar data from Notion database
- **Description**: Retrieves vacation calendar information from a Notion database.

### Flight Search

#### Search Flights (Flight API)
- **Endpoint**: `GET /flights/search`
- **Query Parameters**: Flight search criteria
- **Response**: Flight search results
- **Description**: Searches for flights using a flight search API.

#### Search Flights (SERP API)
- **Endpoint**: `GET /flights/search/serp`
- **Query Parameters**: Flight search criteria
- **Response**: Flight search results from SERP API
- **Description**: Searches for flights using the SERP API.

### ComfyICU (AI Image Generation)

#### Run Workflow
- **Endpoint**: `POST /comfyicu/workflows/:workflow_id/runs` or `POST /comfyicu/run`
- **Content-Type**: `application/json`
- **URL Parameters** (first variant):
  - `workflow_id`: ID of the workflow to run
- **Request Body**:
  - `workflow_id` (for second variant): ID of the workflow to run
  - `prompt`: Prompt for the image generation
  - `files` (optional): Array of files to use
  - `webhook` (optional): Webhook URL for notifications
  - `accelerator` (optional): Type of accelerator to use
- **Response**: Information about the started workflow run
- **Description**: Runs an AI image generation workflow in ComfyICU.

#### Get Run Status
- **Endpoint**: `GET /comfyicu/workflows/:workflow_id/runs/:run_id`
- **URL Parameters**:
  - `workflow_id`: ID of the workflow
  - `run_id`: ID of the run
- **Response**: Status of the workflow run
- **Description**: Gets the status of a running workflow.

#### Generate Image
- **Endpoint**: `POST /comfyicu/generate-image`
- **Content-Type**: `application/json`
- **Request Body**: Image generation parameters
- **Response**: Generated image information
- **Description**: Generates an image using a simplified interface.

#### Run Exact Workflow
- **Endpoint**: `POST /comfyicu/exact-workflow`
- **Content-Type**: `application/json`
- **Request Body**: Detailed workflow configuration
- **Response**: Workflow run information
- **Description**: Runs a precisely defined workflow with all parameters specified.

#### Face Swap
- **Endpoint**: `POST /comfyicu/face-swap`
- **Content-Type**: `application/json`
- **Request Body**: Face swap parameters including image URLs
- **Response**: Result of the face swap operation
- **Description**: Performs a face swap operation using reference images.

#### Face Swap with Upload
- **Endpoint**: `POST /comfyicu/face-swap-upload`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `face_image`: Image file containing the reference face
  - Other face swap parameters
- **Response**: Result of the face swap operation
- **Description**: Performs a face swap operation using an uploaded reference image.

#### Test Connection
- **Endpoint**: `GET /comfyicu/test-connection`
- **Response**: Connection status information
- **Description**: Tests the connection to the ComfyICU API.

### LinkedIn

The LinkedIn API endpoints are available but not detailed in this documentation.
