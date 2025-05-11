require('dotenv').config(); // For local development
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Initialize bot with your Telegram token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start command
bot.start((ctx) => {
  ctx.replyWithMarkdown(`
    🤖 *AI Chat Bot* 🤖
    
    Welcome! I'm powered by OpenRouter AI. Just send me a message and I'll respond.
    
    *Commands:*
    /start - Show this message
    /help - Get help
    /about - About this bot
    /model - Change AI model
    
    Current model: *${process.env.DEFAULT_MODEL || 'deepseek/deepseek-v3-base:free'}*
  `);
});

// Help command
bot.help((ctx) => {
  ctx.replyWithMarkdown(`
    *How to use this bot:*
    
    Simply send me any message and I'll generate a response using AI.
    
    *Available Commands:*
    /model - Switch between different AI models
    /about - Learn about this bot
    
    *Note:* Responses may not always be accurate.
  `);
});

// About command
bot.command('about', (ctx) => {
  ctx.replyWithMarkdown(`
    *About This Bot*
    
    Powered by:
    - [OpenRouter.ai](https://openrouter.ai) API
    - Hosted on Vercel
    - Using Node.js and Telegraf
    
    Created with ❤️ by you!
  `);
});

// Model selection command
bot.command('model', (ctx) => {
  ctx.replyWithMarkdown(`
    *Available AI Models:*
    
    1. \`deepseek/deepseek-v3-base:free\` (Default)
    2. \`openai/gpt-3.5-turbo\`
    3. \`anthropic/claude-3-haiku\`
    
    Reply with the model number to switch.
    Current model: *${ctx.session.model || process.env.DEFAULT_MODEL || 'deepseek/deepseek-v3-base:free'}*
  `);
});

// Handle model selection
bot.on('text', async (ctx) => {
  // Check if this is a response to /model command
  if (ctx.message.reply_to_message?.text?.includes('Available AI Models')) {
    const modelMap = {
      '1': 'deepseek/deepseek-v3-base:free',
      '2': 'openai/gpt-3.5-turbo',
      '3': 'anthropic/claude-3-haiku'
    };
    
    const selectedModel = modelMap[ctx.message.text.trim()];
    if (selectedModel) {
      ctx.session.model = selectedModel;
      return ctx.reply(`✅ Switched to model: ${selectedModel}`);
    }
  }
  
  // Ignore commands (already handled)
  if (ctx.message.text.startsWith('/')) return;

  try {
    // Show typing indicator
    await ctx.replyWithChatAction('typing');
    
    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "https://your-bot.vercel.app",
        "X-Title": process.env.SITE_NAME || "Telegram AI Bot",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": ctx.session.model || process.env.DEFAULT_MODEL || "deepseek/deepseek-v3-base:free",
        "messages": [{
          "role": "user",
          "content": ctx.message.text
        }],
        "temperature": 0.7,
        "max_tokens": 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data?.choices?.[0]?.message?.content) {
      await ctx.reply(data.choices[0].message.content);
    } else {
      await ctx.reply("⚠️ I couldn't generate a response. Please try again.");
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply("❌ Sorry, I'm having trouble responding right now.");
  }
});

// Middleware for simple session management
bot.use((ctx, next) => {
  ctx.session = ctx.session || {};
  return next();
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ status: 'Bot is running 🚀' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};