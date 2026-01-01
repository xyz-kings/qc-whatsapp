const express = require("express")
const path = require("path")
const fetch = require("node-fetch")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")

const app = express()
const router = express.Router()
const PORT = process.env.PORT || 3000

// === REGISTER FONT ===
GlobalFonts.registerFromPath(path.join(__dirname, "xyzfont.ttf"), "XyzFont")
GlobalFonts.registerFromPath(path.join(__dirname, "emoji.ttf"), "EmojiFont")

// ================= ROOT API =================
router.get("/", (req, res) => {
  res.json({
    status: true,
    endpoints: {
      v1: "/api/qc/v1",
      v2: "/api/qc/v2"
    },
    note: "Support emoji warna pakai Twemoji CDN"
  })
})

// === FETCH IMAGE BUFFER ===
async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 10000
  })
  if (!res.ok) throw new Error("Gagal ambil image")
  return Buffer.from(await res.arrayBuffer())
}

// === EMOJI ===
const emojiRegex = /\p{Extended_Pictographic}/gu

function parseTextEmoji(text) {
  const parts = []
  let last = 0
  for (const m of text.matchAll(emojiRegex)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ emoji: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

function codepointToTwemojiPNG(e) {
  return `https://twemoji.maxcdn.com/v/latest/72x72/${Array.from(e)
    .map(c => c.codePointAt(0).toString(16))
    .join("-")}.png`
}

// === WRAP TEXT ===
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ")
  const lines = []
  let line = ""

  for (const word of words) {
    const test = line ? line + " " + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// === DRAW UTILS ===
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function drawTextWithEmoji(ctx, parts, x, y, fontSize) {
  let ox = 0
  for (const p of parts) {
    if (p.text) {
      ctx.fillText(p.text, x + ox, y)
      ox += ctx.measureText(p.text).width
    }
    if (p.emoji) {
      try {
        const img = await loadImage(
          await fetchImageBuffer(codepointToTwemojiPNG(p.emoji))
        )
        const size = fontSize * 0.9
        ctx.drawImage(img, x + ox, y - fontSize + 6, size, size)
        ox += size
      } catch {}
    }
  }
}

// === JUSTIFY LINE ===
async function drawJustifiedLine(ctx, text, x, y, maxWidth, fontSize) {
  const words = text.split(" ")
  if (words.length < 2) {
    await drawTextWithEmoji(ctx, parseTextEmoji(text), x, y, fontSize)
    return
  }

  const wordsWidth = words.reduce(
    (sum, w) => sum + ctx.measureText(w).width,
    0
  )

  const spaceWidth = (maxWidth - wordsWidth) / (words.length - 1)

  let offsetX = 0
  for (let i = 0; i < words.length; i++) {
    await drawTextWithEmoji(
      ctx,
      parseTextEmoji(words[i]),
      x + offsetX,
      y,
      fontSize
    )
    offsetX += ctx.measureText(words[i]).width
    if (i < words.length - 1) offsetX += spaceWidth
  }
}

// === QC HANDLER ===
function qcHandler(version) {
  return async (req, res) => {
    try {
      const { avatar, name = "Unknown 😎", message = "Halo 😄🔥" } = req.query
      if (!avatar)
        return res.status(400).json({ status: false, message: "avatar wajib" })

      const canvasSize = 820
      const canvas = createCanvas(canvasSize, canvasSize)
      const ctx = canvas.getContext("2d")

      const avatarSize = 104
      const avatarX = 24
      const gap = 28
      const bubbleRightMargin = 24

      const bubbleWidth =
        canvasSize - avatarX - avatarSize - gap - bubbleRightMargin

      const nameSize = 64
      const msgSize = 60
      const lineHeight = 68

      const PADDING_TOP = 30
      const PADDING_BOTTOM = 40
      const NAME_TOP_OFFSET = 26
      const NAME_MESSAGE_GAP = 12
      const SIDE_PADDING = 24

      ctx.font = `${msgSize}px "XyzFont"`
      const rawLines = message.split("\n")
      const msgLines = rawLines.flatMap(l =>
        wrapText(ctx, l, bubbleWidth - SIDE_PADDING * 2)
      )

      const bubbleHeight =
        PADDING_TOP +
        nameSize +
        NAME_MESSAGE_GAP +
        msgLines.length * lineHeight +
        PADDING_BOTTOM

      const startY = (canvasSize - Math.max(avatarSize, bubbleHeight)) / 2
      const bubbleX = avatarX + avatarSize + gap

      const avatarImg = await loadImage(await fetchImageBuffer(avatar))
      ctx.save()
      ctx.beginPath()
      ctx.arc(
        avatarX + avatarSize / 2,
        startY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      )
      ctx.clip()
      ctx.drawImage(avatarImg, avatarX, startY, avatarSize, avatarSize)
      ctx.restore()

      ctx.fillStyle = version === "v1" ? "#ffffff" : "#000000"
      roundRect(ctx, bubbleX, startY, bubbleWidth, bubbleHeight, 40)
      ctx.fill()

      ctx.fillStyle = "#d97706"
      ctx.font = `bold ${nameSize}px "XyzFont"`
      const nameY = startY + NAME_TOP_OFFSET + nameSize
      await drawTextWithEmoji(
        ctx,
        parseTextEmoji(name),
        bubbleX + SIDE_PADDING,
        nameY,
        nameSize
      )

      ctx.fillStyle = version === "v1" ? "#000000" : "#ffffff"
      ctx.font = `${msgSize}px "XyzFont"`
      let msgY = nameY + NAME_MESSAGE_GAP + lineHeight
      const maxTextWidth = bubbleWidth - SIDE_PADDING * 2

      for (let i = 0; i < msgLines.length; i++) {
        const line = msgLines[i]
        if (i === msgLines.length - 1) {
          await drawTextWithEmoji(
            ctx,
            parseTextEmoji(line),
            bubbleX + SIDE_PADDING,
            msgY,
            msgSize
          )
        } else {
          await drawJustifiedLine(
            ctx,
            line,
            bubbleX + SIDE_PADDING,
            msgY,
            maxTextWidth,
            msgSize
          )
        }
        msgY += lineHeight
      }

      res.setHeader("Content-Type", "image/png")
      res.end(canvas.toBuffer("image/png"))
    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  }
}

// === ROUTES ===
router.get("/qc/v1", qcHandler("v1"))
router.get("/qc/v2", qcHandler("v2"))
app.use("/api", router)

// === LOCAL ONLY ===
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () =>
    console.log(`QC API lokal → http://localhost:${PORT}`)
  )
}

module.exports = app