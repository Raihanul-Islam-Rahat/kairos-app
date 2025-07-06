import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client-side environment variables need to be prefixed with NEXT_PUBLIC_
// These will be securely exposed to the browser by Next.js if properly configured in Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function KairosDashboard() {
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState("");
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure Supabase client is initialized before using it
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase URL or Key is missing. Please check your Vercel Environment Variables.");
      setSolution("Configuration Error: Supabase keys are missing.");
      return;
    }
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    }).catch(error => {
      console.error("Error fetching user from Supabase:", error);
    });
  }, []);

  const handleLearn = async () => {
    if (!question.trim()) {
      setSolution("Please enter a question.");
      return;
    }
    setLoading(true);
    setSolution("");

    try {
      // Step 1: Insert user input into Supabase (if user exists)
      if (user) {
        const { data: insertData, error: insertError } = await supabase
          .from('learn_requests') // Assuming you have a 'learn_requests' table
          .insert([{ user_id: user.id, input_text: question }]);

        if (insertError) {
          console.error('Error inserting into Supabase:', insertError);
          // Don't block the OpenAI call if Supabase insert fails
        } else {
          console.log('Input inserted into Supabase:', insertData);
        }
      } else {
        console.warn('User not logged in, skipping Supabase input insert.');
      }


      // Step 2: Call OpenAI API
      // This key should NOT be NEXT_PUBLIC_ and is ideally used in a Vercel Serverless Function (API route)
      // For now, it remains as is, relying on Next.js server-side rendering or build-time access
      const openaiApiKey = process.env.OPENAI_API_KEY; 
      if (!openaiApiKey) {
        console.error('OPENAI_API_KEY is not set in environment variables. Ensure it is not prefixed with NEXT_PUBLIC_');
        setSolution('Configuration Error: OpenAI API key not found.');
        setLoading(false); // Stop loading if API key is missing
        return;
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
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
      if (response.ok) {
        const aiText = data.choices?.[0]?.message?.content || "No response from Kairos.";
        setSolution(aiText);

        // Step 3: Store OpenAI response in Supabase (if user exists and insert was successful)
        if (user && aiText !== "No response from Kairos.") {
            const { data: updateData, error: updateError } = await supabase
                .from('learn_requests')
                .update({ openai_response: aiText })
                .eq('input_text', question); // This might need a more robust identifier like an ID if input_text isn't unique

            if (updateError) {
                console.error('Error updating Supabase with OpenAI response:', updateError);
            } else {
                console.log('OpenAI response updated in Supabase:', updateData);
            }
        }
      } else {
        console.error('OpenAI API error:', data);
        setSolution(`Error from Kairos AI: ${data.error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      setSolution("Error: Unable to contact Kairos AI right now.");
      console.error("An unexpected error occurred during handleLearn:", error);
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
      {solution && <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{solution}</pre>}
    </div>
  );
}
