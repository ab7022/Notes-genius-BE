require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(express.json())

// CORS: allow your Vercel app and localhost:3000
app.use(cors({
  origin(origin, cb) {
    if (!origin || ['https://note-genius-ai.vercel.app','http://localhost:3000'].includes(origin)) {
      return cb(null, true)
    }
    cb(new Error('Not allowed by CORS'))
  }
}))

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

app.post('/summarize', async (req, res) => {
  try {
    const { content } = req.body
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' })
    }

    // dev fallback
    if (!DEEPSEEK_API_KEY) {
      const sents = content.split(/[.!?]+/)
      const n = Math.max(1, Math.ceil(sents.length * 0.2))
      return res.json({ summary: sents.slice(0,n).join('. ').trim()+'.' })
    }

    // real DeepSeek call
    const deepRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful, intelligent assistant that reads and summarizes text for users.When summarizing:- Capture the key points and ideas clearly.- Avoid copying long phrases directly from the original.- Use your own words unless quoting is necessary.- Keep the tone neutral and professional.- Prioritize clarity and conciseness.- If the input is disorganized or noisy, structure the summary logically.If the text contains:- A list → convert it into a cleaner bullet-point summary.- A narrative or article → give a paragraph summary of main events and conclusions.- A technical or factual explanation → preserve accuracy and simplify where possible.' },
          { role: 'user', content: `Please summarize: ${content}` }
        ],
        max_tokens: 3000
      })
    })

    if (!deepRes.ok) {
      const err = await deepRes.text()
      console.error('DeepSeek error:', err)
      return res.status(500).json({ error: 'DeepSeek failed' })
    }

    const { choices } = await deepRes.json()
    return res.json({ summary: choices[0].message.content.trim() })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
