exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("AI service is not configured");
    }

    const { fileBase64, fileName, mimeType } =
      JSON.parse(event.body || "{}");

    if (!fileBase64 || !fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Video file is required" })
      };
    }

    const buffer = Buffer.from(fileBase64, "base64");

    if (buffer.length > 3 * 1024 * 1024) {
      return {
        statusCode: 413,
        body: JSON.stringify({
          error: "For this first test, use a file under 3 MB."
        })
      };
    }

    const form = new FormData();

    form.append(
      "file",
      new Blob([buffer], {
        type: mimeType || "video/mp4"
      }),
      fileName
    );

    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: form
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: result.error?.message || "Transcription failed"
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transcript: result.text,
        segments: result.segments || []
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Something went wrong"
      })
    };
  }
};
