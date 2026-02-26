import { NextResponse } from "next/server";

const MOCK_RESPONSE = {
  ideas: [
    { id: "mock-1", title: "Mock Idea 1", cluster: "Core" },
    { id: "mock-2", title: "Mock Idea 2", cluster: "Growth" },
  ],
  source: "mock",
};

function normalizeIdeas(rawIdeas) {
  if (!Array.isArray(rawIdeas)) {
    return [];
  }

  return rawIdeas
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) {
        return null;
      }

      const cluster = typeof item.cluster === "string" && item.cluster.trim() ? item.cluster.trim() : "Core";
      const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `ai-${index + 1}`;

      return { id, title, cluster };
    })
    .filter((item) => item !== null);
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(MOCK_RESPONSE);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return strict JSON with shape { ideas: [{ id, title, cluster }] }. Keep ideas concise and execution-focused.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI draft generation failed." }, { status: 502 });
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : {};
    const ideas = normalizeIdeas(parsed?.ideas);

    if (ideas.length === 0) {
      return NextResponse.json({ error: "AI returned no ideas." }, { status: 502 });
    }

    return NextResponse.json({
      ideas,
      source: "openai",
    });
  } catch {
    return NextResponse.json({ error: "AI draft generation failed." }, { status: 502 });
  }
}
