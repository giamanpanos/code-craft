import { NextRequest, NextResponse } from "next/server";

const LANGUAGE_MAP: Record<string, { language: string; versionIndex: string }> =
  {
    javascript: {
      language: "nodejs",
      versionIndex: "4",
    },
    typescript: {
      language: "typescript",
      versionIndex: "0",
    },
    python: {
      language: "python3",
      versionIndex: "4",
    },
    java: {
      language: "java",
      versionIndex: "4",
    },
    go: {
      language: "go",
      versionIndex: "4",
    },
    rust: {
      language: "rust",
      versionIndex: "4",
    },
    cpp: {
      language: "cpp",
      versionIndex: "5",
    },
    csharp: {
      language: "csharp",
      versionIndex: "4",
    },
    ruby: {
      language: "ruby",
      versionIndex: "4",
    },
    swift: {
      language: "swift",
      versionIndex: "4",
    },
  };

export async function POST(request: NextRequest) {
  try {
    const { language, code, stdin = "" } = await request.json();

    if (!language || !code) {
      return NextResponse.json(
        { error: "Language and code are required" },
        { status: 400 },
      );
    }

    const runtime = LANGUAGE_MAP[language];

    if (!runtime) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 },
      );
    }

    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        stdin,
        language: runtime.language,
        versionIndex: runtime.versionIndex,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json(
        {
          error: data.error || "JDoodle execution failed",
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("JDoodle execution error:", error);

    return NextResponse.json(
      { error: "Failed to execute code" },
      { status: 500 },
    );
  }
}
