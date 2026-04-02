require("dotenv").config({ path: ".env.local" });
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hello" }],
        });
        console.log("Success:", completion.choices[0].message.content);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

test();
