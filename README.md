![xIT Logo](src/assets/xit_logo.png)

# xIT

xIT is an AI-powered video editing application built with Electron, React, and Remotion. It leverages local FFmpeg processing and AI services (Gemini, OpenAI, Fal.ai) to provide a powerful video creation workflow.

## Features

-   **AI Video Editing:** Use natural language prompts to edit videos.
-   **Remotion Integration:** Render high-quality motion graphics and animations.
-   **Local Processing:** Uses a local FFmpeg server for fast asset management and rendering.
-   **AI Transcription:** Automatic captions and transcript-based editing.
-   **Generative AI:** Create B-roll, images, and videos using AI models.

## Prerequisites

To run xIT, you need the following installed on your system:

1.  **Node.js:** (v18 or later) - Required for the Electron app and local server.
2.  **Python 3:** Required for local Whisper transcription (optional but recommended for free, accurate captions).
    *   Install `openai-whisper` package: `pip3 install openai-whisper`

## Development

1.  **Install Dependencies:**

    ```bash
    npm install --legacy-peer-deps
    ```

2.  **Start Development:**

    You need to run two processes:

    *   **Vite Dev Server:**
        ```bash
        npm run dev
        ```
    *   **Local FFmpeg Server:**
        ```bash
        npm run ffmpeg-server
        ```

3.  **Run Electron:**
    (You may need a separate terminal or configured runner to launch Electron pointing to the local dev server)

## Building for Windows

To create a standalone `.exe` installer:

1.  **Build the Application:**

    ```bash
    npm run electron:build
    ```

    This command will:
    *   Build the React frontend using Vite.
    *   Package the application using `electron-builder`.

2.  **Output:**
    The installer will be located in the `release/` directory (e.g., `xIT Setup 0.0.1.exe`).

## Configuration

Create a `.dev.vars` file in the root directory with your API keys:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
FAL_KEY=your_fal_ai_key
GIPHY_API_KEY=your_giphy_key
```

## Architecture

*   **Frontend:** React 19, TailwindCSS, Vite.
*   **Backend/Processing:** Local Node.js server (`scripts/local-ffmpeg-server.js`) spawning FFmpeg processes.
*   **Rendering:** Remotion for programmatic video creation.
*   **Wrapper:** Electron for desktop integration.
