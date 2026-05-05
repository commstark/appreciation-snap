import Anthropic from '@anthropic-ai/sdk'

const SNAP_CONTENT_TYPE = 'application/vnd.farcaster.snap+json'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are responding to someone sharing how they're feeling. Your voice is that of a father putting his hand on his child's shoulder — steady, measured, fully present, slightly weighted with experience. You are not a therapist, not a wellness coach, not a buddy. You are an older, grounded presence.

Rules:
- Reply with ONE or TWO short sentences. Never more.
- No advice unless directly asked.
- No questions back to them.
- No emoji.
- No casual register. No "yeah," "ha," "totally," "tracks," or slang.
- No therapy-speak. No "I hear you," "your feelings are valid," "I'm sorry you're feeling that way."
- No motivational poster language. No "you've got this," "you're amazing."
- No follow-up prompts.
- Speak plainly. Use simple words. Let the words carry weight.
- Acknowledge what they said, then offer one quiet observation, reframe, or piece of grounded perspective.
- It's okay to be honest about hard things. Don't soften reality.
- It's okay to share a sliver of your own perspective when it lands ("the body keeps a record").
- For physical states (hot, hungry, sore), respond with the same grounded tone — the body is part of the whole person.

Examples of the right voice:
- "I'm tired" → "Tired is honest. The body keeps a record of everything you've been carrying."
- "I'm stressed out" → "Something matters to you. That's why it has weight. You wouldn't feel this if it didn't."
- "I'm so hot" → "The body asks for what it needs. Listen to it."
- "I won't be able to do it" → "You don't know that yet. You only know it feels too big from where you're standing right now."
- "I feel lost" → "Lost is a place too. You don't have to know where you are to keep walking."
- "I'm doing great" → "Carry that with you. It will matter later."

Now respond to the user's feeling.`

function getBaseUrl(req: Request): string {
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

function snapResponse(body: object) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': SNAP_CONTENT_TYPE,
      'Vary': 'Accept',
    },
  })
}

function inputSnap(baseUrl: string) {
  return {
    version: '2.0',
    theme: { accent: 'teal' },
    ui: {
      root: 'page',
      elements: {
        page: {
          type: 'stack',
          props: { direction: 'vertical', gap: 'lg' },
          children: ['brand-row', 'content'],
        },
        'brand-row': {
          type: 'stack',
          props: { direction: 'horizontal', justify: 'end' },
          children: ['brand'],
        },
        brand: {
          type: 'text',
          props: { content: 'appreciation', weight: 'bold', size: 'sm' },
        },
        content: {
          type: 'stack',
          props: { direction: 'vertical', gap: 'md' },
          children: ['title', 'feeling-input', 'send-btn'],
        },
        title: {
          type: 'text',
          props: { content: "I'm feeling...", weight: 'bold' },
        },
        'feeling-input': {
          type: 'input',
          props: {
            name: 'feeling',
            placeholder: 'tired, stressed, lost, good',
            maxLength: 200,
          },
        },
        'send-btn': {
          type: 'button',
          props: { label: 'Send', variant: 'primary' },
          on: {
            press: {
              action: 'submit',
              params: { target: `${baseUrl}/` },
            },
          },
        },
      },
    },
  }
}

function replySnap(baseUrl: string, feeling: string, reply: string) {
  return {
    version: '2.0',
    theme: { accent: 'teal' },
    ui: {
      root: 'page',
      elements: {
        page: {
          type: 'stack',
          props: { direction: 'vertical', gap: 'lg' },
          children: ['brand-row', 'content'],
        },
        'brand-row': {
          type: 'stack',
          props: { direction: 'horizontal', justify: 'end' },
          children: ['brand'],
        },
        brand: {
          type: 'text',
          props: { content: 'appreciation', weight: 'bold', size: 'sm' },
        },
        content: {
          type: 'stack',
          props: { direction: 'vertical', gap: 'md' },
          children: ['echo', 'reply-text', 'actions'],
        },
        echo: {
          type: 'text',
          props: { content: `you said: ${feeling}`, size: 'sm' },
        },
        'reply-text': {
          type: 'text',
          props: { content: reply, weight: 'bold' },
        },
        actions: {
          type: 'stack',
          props: { direction: 'horizontal', gap: 'sm' },
          children: ['share-btn', 'again-btn'],
        },
        'share-btn': {
          type: 'button',
          props: { label: 'Share', variant: 'primary', icon: 'share' },
          on: {
            press: {
              action: 'compose_cast',
              params: {
                text: `i said i was feeling ${feeling}\n\nappreciation snap said:\n${reply}`,
                embeds: [baseUrl],
              },
            },
          },
        },
        'again-btn': {
          type: 'button',
          props: { label: 'Again', variant: 'secondary' },
          on: {
            press: {
              action: 'submit',
              params: { target: `${baseUrl}/` },
            },
          },
        },
      },
    },
  }
}

function htmlFallback(baseUrl: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <title>Appreciation Snap</title>
  <meta name="description" content="How you feeling?" />
</head>
<body style="font-family:system-ui;background:#faf6ef;color:#1f1d2b;padding:24px">
  <h1>Appreciation Snap</h1>
  <p style="color:#8a8294">This renders as a Snap inside Farcaster. Open it in Warpcast to use it.</p>
</body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html',
        'Vary': 'Accept',
        'Link': `<${baseUrl}/>; rel="alternate"; type="${SNAP_CONTENT_TYPE}"`,
      },
    },
  )
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req)
  const accept = req.headers.get('accept') || ''

  if (accept.includes(SNAP_CONTENT_TYPE)) {
    return snapResponse(inputSnap(baseUrl))
  }

  return htmlFallback(baseUrl)
}

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req)
  const body = await req.json()

  // Log the full POST body to diagnose structure
  console.log('POST body:', JSON.stringify(body, null, 2))

  // Try multiple possible locations for the feeling input
  const feeling = body?.inputs?.feeling
    || body?.payload?.inputs?.feeling
    || body?.body?.payload?.inputs?.feeling

  if (!feeling || typeof feeling !== 'string' || feeling.length > 200) {
    return snapResponse(inputSnap(baseUrl))
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `I'm feeling ${feeling}` }],
  })

  const reply = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('')
    .trim()

  return snapResponse(replySnap(baseUrl, feeling, reply))
}
