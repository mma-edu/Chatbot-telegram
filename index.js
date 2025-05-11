const { Telegraf, session } = require('telegraf');
const fetch = require('node-fetch');

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Session middleware (for model selection)
bot.use(session());

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Start command
bot.start((ctx) => {
  const currentModel = ctx.session.model || process.env.DEFAULT_MODEL || 'deepseek/deepseek-v3-base:free';
  ctx.replyWithMarkdown(`
    🤖 *AI Chat Bot* 🤖
    
    Send me any message and I'll respond using *${currentModel}*.
    
    *Commands:*
    /help - Show help
    /about - About this bot
    /model - Change AI model
  `);
});

// Help command
bot.help((ctx) => {
  ctx.replyWithMarkdown(`
    *How to use:*
    Just send me a message!
    
    *Available Commands:*
    /model - Switch AI models
    /about - Bot information
  `);
});

// About command
bot.command('about', (ctx) => {
  ctx.replyWithMarkdown(`
    *About This Bot*
    - I'm a deepseek model chatbot.
  `);
});

// Model selection command
bot.command('model', (ctx) => {
  const modelKeyboard = {
    reply_markup: {
      keyboard: [
        ['deepseek/deepseek-v3-base:free'],
        ['openai/gpt-3.5-turbo'],
        ['anthropic/claude-3-haiku']
      ],
      one_time_keyboard: true
    }
  };
  
  ctx.reply(
    'Select an AI model:',
    modelKeyboard
  );
});

// Handle text messages
bot.on('text', async (ctx) => {
  // Handle model selection
  const modelOptions = [
    'deepseek/deepseek-v3-base:free',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-haiku'
  ];
  
  if (modelOptions.includes(ctx.message.text)) {
    ctx.session.model = ctx.message.text;
    return ctx.reply(`✅ Switched to: ${ctx.message.text}`);
  }

  // Ignore commands
  if (ctx.message.text.startsWith('/')) return;

  try {
    await ctx.replyWithChatAction('typing');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://your-bot.vercel.app',
        'X-Title': process.env.SITE_NAME || 'Telegram AI Bot'
      },
      body: JSON.stringify({
        model: ctx.session.model || process.env.DEFAULT_MODEL || 'deepseek/deepseek-v3-base:free',
        messages: [{
          role: 'user',
          content: ctx.message.text
        }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${error}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    
    // Split long messages to avoid Telegram limits
    if (reply.length > 4000) {
      for (let i = 0; i < reply.length; i += 4000) {
        await ctx.reply(reply.substring(i, i + 4000));
      }
    } else {
      await ctx.reply(reply);
    }
  } catch (error) {
    console.error('API Error:', error);
    ctx.reply('⚠️ Error: ' + (error.message || 'Failed to get response'));
  }
});

// Vercel handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ status: 'Bot is running 🚀' });
    }
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};