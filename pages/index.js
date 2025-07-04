import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function KairosDashboard() {
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState("");
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLearn = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setSolution("");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are Kairos, a calm and clear-thinking productivity and learning assistant. Explain clearly and briefly."
            },
            {
              role: "user",
              content: question
            }
          ],
          temperature: 0.7,
        })
      });

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || "No response from Kairos.";
      setSolution(aiText);
    } catch (error) {
      setSolution("Error: Unable to contact Kairos AI right now.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Welcome to Kairos {user ? user.email : "Guest"}</h1>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g., Explain quantum computing"
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />
      <button onClick={handleLearn} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Thinking..." : "Learn with Kairos"}
      </button>
      {solution && <pre style={{ marginTop: 20 }}>{solution}</pre>}
    </div>
  );
}