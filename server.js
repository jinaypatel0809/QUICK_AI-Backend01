import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import Article from './models/Article.js';
import BlogTitle from './models/BlogTitle.js';
import ChatSession from './models/ChatMessage.js';
import RemovedObject from './models/RemovedObject.js';
import GeneratedImage from "./models/GeneratedImage.js";import ResumeReview from './models/ResumeReview.js';
import removedBackground from './models/RemovedBackground.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ----------- Middleware -----------
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ----------- MongoDB Connection -----------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log(' MongoDB connected ✅'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ----------- Groq Client -----------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================
// PLAN LIMITS CONFIG
// Free plan: max 10 messages per day
// Premium plan: unlimited
// ============================================================
const FREE_DAILY_MSG_LIMIT = 10;

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ----------- Routes -----------

// POST /api/article/generate
app.post('/api/article/generate', async (req, res) => {
  try {
    const { topic, length, lengthLabel, userId } = req.body;
    if (!topic || !length || !lengthLabel) {
      return res.status(400).json({ success: false, message: 'topic, length, અને lengthLabel જરૂરી છે.' });
    }

    const prompt = `Write a well-structured, engaging article about the following topic:
Topic: "${topic}"
Requirements:
- The article should be approximately ${length} words long (${lengthLabel}).
- Use clear headings and subheadings where appropriate (use markdown ## and ### for headings).
- Write in a professional yet accessible tone.
- Include an introduction, main body with key points, and a conclusion.
- Make the content informative, original, and valuable to readers.
- Do NOT include any preamble like "Here is your article:" — just write the article directly.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    });

    const generatedContent = completion.choices[0].message.content;
    const wordCount = generatedContent.trim().split(/\s+/).length;

    const article = new Article({ topic, length, lengthLabel, content: generatedContent, wordCount, userId: userId || 'anonymous' });
    await article.save();

    return res.status(201).json({
      success: true,
      message: 'Article successfully generate અને save થઈ ગઈ!',
      article: { _id: article._id, topic: article.topic, length: article.length, lengthLabel: article.lengthLabel, content: article.content, wordCount: article.wordCount, createdAt: article.createdAt },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: 'Article generate કરવામાં error આવ્યો.', error: error.message });
  }
});

// GET /api/article/all
app.get('/api/article/all', async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, articles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/blog-titles/generate
app.post('/api/blog-titles/generate', async (req, res) => {
  try {
    const { keyword, category, userId } = req.body;
    if (!keyword || !category) {
      return res.status(400).json({ success: false, message: 'keyword અને category જરૂરી છે.' });
    }

    const prompt = `Generate exactly 8 creative, catchy, and SEO-friendly blog post titles for the following:
Keyword: "${keyword}"
Category: "${category}"
Requirements:
- Each title must be unique and compelling
- Mix different title formats: How-to, listicles, questions, statements
- Titles should be between 8-15 words
- Make them engaging and click-worthy
- Do NOT include numbering or bullet points
- Return ONLY the titles, one per line, nothing else`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
    });

    const rawContent = completion.choices[0].message.content;
    const titles = rawContent.split('\n').map(t => t.trim()).filter(t => t.length > 0).slice(0, 8);

    const blogTitle = new BlogTitle({ keyword, category, titles, userId: userId || 'anonymous' });
    await blogTitle.save();

    return res.status(201).json({
      success: true,
      message: 'Titles successfully generate અને save થઈ ગઈ!',
      blogTitle: { _id: blogTitle._id, keyword: blogTitle.keyword, category: blogTitle.category, titles: blogTitle.titles, createdAt: blogTitle.createdAt },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: 'Titles generate કરવામાં error આવ્યો.', error: error.message });
  }
});

// GET /api/blog-titles/all
app.get('/api/blog-titles/all', async (req, res) => {
  try {
    const blogTitles = await BlogTitle.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, blogTitles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/image/generate
app.post('/api/image/generate', async (req, res) => {
  try {
    const { prompt, style, publish, userId, userName } = req.body;
    if (!prompt || !style) {
      return res.status(400).json({ success: false, message: 'prompt અને style જરૂરી છે.' });
    }

    const fullPrompt = `${prompt}, ${style}, high quality, detailed`;
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true&enhance=true`;

    const imgResponse = await fetch(pollinationsUrl);
    if (!imgResponse.ok) throw new Error(`Pollinations fetch failed: ${imgResponse.status}`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = `data:image/jpeg;base64,${Buffer.from(imgBuffer).toString('base64')}`;

    const generatedImage = new GeneratedImage({ prompt, style, imageUrl: pollinationsUrl, publish: publish || false, userId: userId || 'anonymous', userName: userName || 'User', likes: [] });
    await generatedImage.save();

    return res.status(201).json({
      success: true,
      message: 'Image successfully generate અને save થઈ ગઈ!',
      image: { _id: generatedImage._id, prompt: generatedImage.prompt, style: generatedImage.style, imageUrl: base64Image, publish: generatedImage.publish, createdAt: generatedImage.createdAt },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: 'Image generate કરવામાં error આવ્યો.', error: error.message });
  }
});

// GET /api/image/all
app.get('/api/image/all', async (req, res) => {
  try {
    const images = await GeneratedImage.find({ publish: true }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, images });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


// POST /api/image/like/:id
app.post('/api/image/like/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'userId jaruri che.' });

    const image = await GeneratedImage.findById(req.params.id);
    if (!image) return res.status(404).json({ success: false, message: 'Image mali nahi.' });

    const alreadyLiked = image.likes.includes(userId);
    if (alreadyLiked) {
      image.likes = image.likes.filter(id => id !== userId);
    } else {
      image.likes.push(userId);
    }
    await image.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likesCount: image.likes.length,
      likes: image.likes,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/remove-background/save
app.post('/api/remove-background/save', async (req, res) => {
  try {
    const { imageBase64, originalName } = req.body;
    if (!imageBase64 || !originalName) {
      return res.status(400).json({ success: false, message: 'imageBase64 ane originalName jaruri che.' });
    }
    const removed = new removedBackground({ originalName, imageBase64 });
    await removed.save();
    return res.status(201).json({
      success: true,
      message: 'Image MongoDB ma save thai gai!',
      record: { _id: removed._id, originalName: removed.originalName, createdAt: removed.createdAt },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, message: 'Save karva ma error avyo.', error: error.message });
  }
});

// GET /api/remove-background/all
app.get('/api/remove-background/all', async (req, res) => {
  try {
    const records = await removedBackground.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ REMOVE OBJECT ROUTES — Stability AI Erase API
// ============================================================

// POST /api/remove-object/process
app.post('/api/remove-object/process', async (req, res) => {
  try {
    const { imageBase64, originalName, objectDescription } = req.body;

    if (!imageBase64 || !originalName || !objectDescription?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'imageBase64, originalName ane objectDescription jaruri che.',
      });
    }

    // Base64 → Buffer (data:image/... prefix hatavo — PNG or JPEG dono handle karo)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Dynamic imports
    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;

    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    form.append('output_format', 'png');

    // Stability AI Erase API call
    const stabilityRes = await fetch(
      'https://api.stability.ai/v2beta/stable-image/edit/erase',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: 'image/*',
          ...form.getHeaders(),
        },
        body: form,
      }
    );

    if (!stabilityRes.ok) {
      const errText = await stabilityRes.text();
      console.error('❌ Stability AI Error:', errText);
      return res.status(502).json({
        success: false,
        message: 'Stability AI API error: ' + errText,
      });
    }

    // ✅ Fix 1: buffer() deprecated che, arrayBuffer() use karo
    const arrayBuf = await stabilityRes.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuf);
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    // ✅ Fix 2: MongoDB maa sirf metadata save karo — base64 store karva thi 16MB BSON limit exceed thay
    const record = new RemovedObject({
      originalName,
      objectDescription: objectDescription.trim(),
    });
    await record.save();

    console.log(`✅ Object removed & saved — ID: ${record._id} | Object: "${objectDescription}"`);

    return res.status(201).json({
      success: true,
      message: 'Object successfully remove thayo ane MongoDB ma save thayo!',
      resultImageBase64: resultBase64,
      record: {
        _id: record._id,
        originalName: record.originalName,
        objectDescription: record.objectDescription,
        createdAt: record.createdAt,
      },
    });

  } catch (error) {
    console.error('❌ Remove Object Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Remove object ma error avyo: ' + error.message,
    });
  }
});

// GET /api/remove-object/all
app.get('/api/remove-object/all', async (req, res) => {
  try {
    const records = await RemovedObject
      .find({}, 'originalName objectDescription createdAt')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ============================================================
// ✅ RESUME REVIEW ROUTES — Groq AI PDF Resume Analysis
// ============================================================

// POST /api/resume/review
app.post('/api/resume/review', async (req, res) => {
  try {
    const { pdfBase64, fileName, userId } = req.body;

    if (!pdfBase64 || !fileName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'pdfBase64, fileName ane userId jaruri che.',
      });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

    const prompt = `You are an expert resume reviewer and career coach. Analyze this resume thoroughly.

Return ONLY a valid JSON object with exactly this structure (no markdown, no extra text):
{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}

Scoring: overallScore = overall resume quality. atsScore = ATS friendliness.
Be specific, honest, and constructive.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt + '\n\nResume file: ' + fileName + '\nContent (base64 extract): ' + base64Data.substring(0, 8000),
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0].message.content;

    let analysis;
    try {
      const cleaned = rawResponse.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Groq valid JSON return nathi karyo.');
      analysis = JSON.parse(match[0]);
    }

    if (typeof analysis.overallScore !== 'number' || !analysis.summary || !Array.isArray(analysis.strengths)) {
      throw new Error('Analysis format invalid che.');
    }

    const record = new ResumeReview({
      userId,
      fileName,
      overallScore: Math.min(100, Math.max(0, Math.round(analysis.overallScore))),
      atsScore: Math.min(100, Math.max(0, Math.round(analysis.atsScore || 70))),
      summary: analysis.summary,
      strengths: analysis.strengths.slice(0, 6),
      improvements: analysis.improvements.slice(0, 6),
      suggestions: analysis.suggestions.slice(0, 6),
    });
    await record.save();

    console.log(`✅ Resume reviewed — User: ${userId} | File: ${fileName} | Score: ${record.overallScore}`);

    return res.status(201).json({
      success: true,
      message: 'Resume successfully review thayo!',
      analysis: {
        overallScore: record.overallScore,
        atsScore: record.atsScore,
        summary: record.summary,
        strengths: record.strengths,
        improvements: record.improvements,
        suggestions: record.suggestions,
      },
      record: { _id: record._id, fileName: record.fileName, overallScore: record.overallScore, createdAt: record.createdAt },
    });

  } catch (error) {
    console.error('❌ Resume Review Error:', error);
    return res.status(500).json({ success: false, message: 'Resume review ma error avyo: ' + error.message });
  }
});

// GET /api/resume/history/:userId
app.get('/api/resume/history/:userId', async (req, res) => {
  try {
    const records = await ResumeReview
      .find({ userId: req.params.userId }, 'fileName overallScore atsScore summary createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ CHAT ROUTES — Gemini-style AI Chat with Plan Support
// ============================================================

// POST /api/chat/send
app.post('/api/chat/send', async (req, res) => {
  try {
    const { sessionId, message, userId, plan } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message ખાલી ન હોઈ શકે.' });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authenticated nathi. Login karo.' });
    }

    const userPlan = plan === 'premium' ? 'premium' : 'free';

    // Free plan daily limit check
    if (userPlan === 'free') {
      const todayStart = getTodayStart();
      const todaySessions = await ChatSession.find({
        userId,
        updatedAt: { $gte: todayStart },
      });

      let todayMsgCount = 0;
      for (const s of todaySessions) {
        todayMsgCount += s.messages.filter(m => m.role === 'user').length;
      }

      if (todayMsgCount >= FREE_DAILY_MSG_LIMIT) {
        return res.status(403).json({
          success: false,
          planError: true,
          message: `Free plan limit reached! Aaj ${FREE_DAILY_MSG_LIMIT} messages vaapri lidha che. Premium plan levo mate upgrade karo.`,
          used: todayMsgCount,
          limit: FREE_DAILY_MSG_LIMIT,
        });
      }
    }

    // Session find karo ya navu banavo
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
    }

    if (!session) {
      const titleText = message.trim().slice(0, 50);
      session = new ChatSession({
        userId,
        plan: userPlan,
        title: titleText,
        messages: [],
      });
    }

    session.messages.push({ role: 'user', content: message.trim() });

    const groqMessages = session.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = {
      role: 'system',
      content: `You are QUICK AI, a helpful and intelligent AI assistant. 
You provide clear, accurate, and helpful responses. 
Format your responses using markdown when appropriate (use **bold**, bullet points, code blocks, etc.).
Be conversational, friendly, and concise.`,
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [systemPrompt, ...groqMessages],
      max_tokens: userPlan === 'premium' ? 4096 : 1024,
      temperature: 0.7,
    });

    const aiReply = completion.choices[0].message.content;

    session.messages.push({ role: 'assistant', content: aiReply });
    session.updatedAt = new Date();
    session.plan = userPlan;

    await session.save();
    console.log(`✅ Chat saved — User: ${userId} | Plan: ${userPlan} | Session: ${session._id}`);

    return res.status(200).json({
      success: true,
      sessionId: session._id,
      title: session.title,
      reply: aiReply,
      plan: userPlan,
    });

  } catch (error) {
    console.error('❌ Chat Error:', error);
    return res.status(500).json({ success: false, message: 'Chat error: ' + error.message });
  }
});

// GET /api/chat/sessions
app.get('/api/chat/sessions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'userId required.' });
    }

    const sessions = await ChatSession.find({ userId }, 'title createdAt updatedAt messages plan')
      .sort({ updatedAt: -1 })
      .limit(50);

    const sessionList = sessions.map(s => ({
      _id: s._id,
      title: s.title,
      plan: s.plan,
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({ success: true, sessions: sessionList });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/session/:id
app.get('/api/chat/session/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    const session = await ChatSession.findOne({ _id: req.params.id, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    return res.status(200).json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/chat/session/:id
app.delete('/api/chat/session/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    await ChatSession.findOneAndDelete({ _id: req.params.id, userId });
    return res.status(200).json({ success: true, message: 'Session deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chat/usage
app.get('/api/chat/usage', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(401).json({ success: false });

    const todayStart = getTodayStart();
    const todaySessions = await ChatSession.find({
      userId,
      updatedAt: { $gte: todayStart },
    });

    let todayMsgCount = 0;
    for (const s of todaySessions) {
      todayMsgCount += s.messages.filter(m => m.role === 'user').length;
    }

    return res.status(200).json({
      success: true,
      used: todayMsgCount,
      limit: FREE_DAILY_MSG_LIMIT,
      remaining: Math.max(0, FREE_DAILY_MSG_LIMIT - todayMsgCount),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});


// ============================================================
// ✅ DASHBOARD ROUTE — User na total & recent creations
// ============================================================

// GET /api/dashboard/:userId
app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'userId jaruri che.' });

    // Parallel fetch all user creations
    const [articles, blogTitles, images, resumeReviews] = await Promise.all([
      Article.find({ userId }, 'topic createdAt').sort({ createdAt: -1 }).limit(20),
      BlogTitle.find({ userId }, 'keyword category createdAt').sort({ createdAt: -1 }).limit(20),
      GeneratedImage.find({ userId }, 'prompt style publish createdAt').sort({ createdAt: -1 }).limit(20),
      ResumeReview.find({ userId }, 'fileName overallScore createdAt').sort({ createdAt: -1 }).limit(20),
    ]);

    // Normalize into unified format
    const normalize = (items, type, promptFn, sectionLabel) =>
      items.map(item => ({
        _id: item._id,
        prompt: promptFn(item),
        section: sectionLabel,
        type,
        createdAt: item.createdAt,
      }));

    const allCreations = [
      ...normalize(articles, 'article', i => i.topic, 'Write Article'),
      ...normalize(blogTitles, 'blog-title', i => `${i.keyword} (${i.category})`, 'Blog Titles'),
      ...normalize(images, 'image', i => i.prompt, 'Generate Images'),
      ...normalize(resumeReviews, 'resume', i => `${i.fileName} — Score: ${i.overallScore}/100`, 'Review Resume'),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      totalCreations: allCreations.length,
      recentCreations: allCreations.slice(0, 20),
      breakdown: {
        articles: articles.length,
        blogTitles: blogTitles.length,
        images: images.length,
        resumeReviews: resumeReviews.length,
      },
    });

  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚀 QUICK AI Server is running!' });
});

// ----------- Start Server -----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});