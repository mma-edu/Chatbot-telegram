const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Start command
bot.start((ctx) => {
  ctx.replyWithMarkdown(`
    🤖 *AI ChatBot Powered by OpenRouter* 🤖

    Send me a message, and I'll generate a smart response using AI!

    *Commands:*
    /start - Show this message
    /help - Get help
    /about - About this bot
  `);
});

// Help command
bot.help((ctx) => {
  ctx.replyWithMarkdown(`
    *How to use this bot:*
    Just send me any message, and I'll reply using AI!

    *Available Models:*
    - DeepSeek-V3 (Default)
    - GPT-3.5/4 (Change in code)
    
    *Note:* This bot may sometimes give incorrect answers.
  `);
});

// About command
bot.command("about", (ctx) => {
  ctx.replyWithMarkdown(`
    *About This Bot*
    - Powered by [OpenRouter.ai](https://openrouter.ai)
    - Uses *DeepSeek-V3* AI model
    - Hosted on *Vercel*
    - Developed by YOU! 🚀
  `);
});

// Handle all text messages
bot.on("text", async (ctx) => {
  const userMessage = ctx.message.text;

  // Ignore commands (already handled)
  if (userMessage.startsWith("/")) return;

  try {
    // Show "typing..." status
    await ctx.replyWithChatAction("typing");

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "https://your-bot.vercel.app",
        "X-Title": process.env.SITE_NAME || "Telegram AI Bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3-base:free", // Default model
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data?.choices?.[0]?.message?.content) {
      await ctx.reply(data.choices[0].message.content);
    } else {
      await ctx.reply("⚠️ Sorry, I couldn't generate a response. Try again later.");
    }
  } catch (error) {
    console.error("Error:", error);
    await ctx.reply("❌ Error processing your request. Please try again.");
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Bot error:`, err);
  ctx.reply("❌ Something went wrong. Please try again later.");
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body, res);
  } else {
    res.status(200).json({ status: "Bot is running 🚀" });
  }
};