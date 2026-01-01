const express = require("express")
const fetch = require("node-fetch")
const { createCanvas, loadImage, registerFont } = require("canvas")

const app = express()
const PORT = process.env.PORT || 3000

// === FONT ===
registerFont("./font.ttf", { family: "QCFont" })
registerFont("./emoji.ttf", { family: "EmojiFont" })

// === CONFIG ===
const WIDTH = 900
const AVATAR_SIZE = 90
const SIDE_PADDING = 36
const TOP_GAP = 40
const BOTTOM_GAP = 40
const LINE_HEIGHT = 34
const RADIUS = 28

// === ROOT ===
app.get("/", (_, res) => {
  res.json({
    status: true,
    endpoints: {
      v1: "/api/qc/v1",
      v2: "/api/qc/v2"
    }
  })
})

// === TEXT WRAP ===
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ")
  const lines = []
  let line = ""

  for (const w of words) {
    const test = line + w + " "
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line.trim())
      line = w + " "
    } else {
      line = test
    }
  }
  if (line) lines.push(line.trim())
  return lines
}

// === JUSTIFY ===
function drawJustify(ctx, text, x, y, maxWidth) {
  const words = text.split(" ")
  if (words.length < 2) return ctx.fillText(text, x, y)

  const wordsWidth = words.reduce(
    (a, w) => a + ctx.measureText(w).width,
    0
  )

  const space = (maxWidth - wordsWidth) / (words.length - 1)
  let offset = 0

  words.forEach((w, i) => {
    ctx.fillText(w, x + offset, y)
    offset += ctx.measureText(w).width + (i < words.length - 1 ? space : 0)
  })
}

// === BUBBLE ===
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// === HANDLER ===
function qcHandler(mode) {
  return async (req, res) => {
    try {
      const { avatar, name, message } = req.query
      if (!avatar) return res.json({ status: false, message: "avatar wajib" })

      const canvas = createCanvas(WIDTH, 10)
      const ctx = canvas.getContext("2d")

      ctx.font = "26px QCFont"
      const maxTextWidth = WIDTH - 220
      const lines = wrapText(ctx, message || "Halo 😄🔥", maxTextWidth)

      const bubbleHeight =
        TOP_GAP + 30 + lines.length * LINE_HEIGHT + BOTTOM_GAP

      canvas.height = Math.max(AVATAR_SIZE + 80, bubbleHeight + 80)

      // background
      ctx.fillStyle = mode === "v1" ? "#e5ddd5" : "#0b141a"
      ctx.fillRect(0, 0, WIDTH, canvas.height)

      // avatar
      const img = await loadImage(avatar)
      ctx.save()
      ctx.beginPath()
      ctx.arc(55, 55, AVATAR_SIZE / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 10, 10, AVATAR_SIZE, AVATAR_SIZE)
      ctx.restore()

      // bubble
      const bubbleX = 120
      const bubbleY = 30
      const bubbleW = WIDTH - bubbleX - 20

      ctx.fillStyle = mode === "v1" ? "#ffffff" : "#1f2c34"
      roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleHeight, RADIUS)
      ctx.fill()

      // name
      ctx.font = "bold 24px QCFont"
      ctx.fillStyle = "#00a884"
      ctx.fillText(name || "Unknown 😎", bubbleX + SIDE_PADDING, bubbleY + 34)

      // message
      ctx.font = "26px QCFont"
      ctx.fillStyle = mode === "v1" ? "#000000" : "#e9edef"

      let y = bubbleY + 68
      for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1) {
          ctx.fillText(lines[i], bubbleX + SIDE_PADDING, y)
        } else {
          drawJustify(
            ctx,
            lines[i],
            bubbleX + SIDE_PADDING,
            y,
            bubbleW - SIDE_PADDING * 2
          )
        }
        y += LINE_HEIGHT
      }

      res.setHeader("Content-Type", "image/png")
      res.end(canvas.toBuffer())
    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  }
}

// === ROUTES ===
app.get("/api/qc/v1", qcHandler("v1"))
app.get("/api/qc/v2", qcHandler("v2"))

if (!process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log("QC API jalan → http://localhost:" + PORT)
  )
}

module.exports = app
module.exports.default = app