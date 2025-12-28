import express from "express"
import { createCanvas, loadImage } from "canvas"
import fetch from "node-fetch"

const app = express()

app.get("/api/qc", async (req, res) => {
  try {
    const avatarURL = req.query.avatar
    const name = req.query.name || "Unknown"
    const message = req.query.message || "..."

    if (!avatarURL) {
      return res.status(400).json({ error: "avatar wajib" })
    }

    // Canvas persegi
    const size = 512
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext("2d")

    // Background transparan (biar enak jadi stiker)
    ctx.clearRect(0, 0, size, size)

    // Avatar (kiri kecil, rasio kira-kira 3:1 feel)
    const avatarImg = await loadImage(avatarURL)
    const avatarSize = 96
    const avatarX = 32
    const avatarY = 32

    ctx.save()
    ctx.beginPath()
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    )
    ctx.clip()
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()

    // Bubble (kanan)
    const bubbleX = 160
    const bubbleY = 32
    const bubbleW = 320
    const bubbleH = 200
    const radius = 24

    ctx.fillStyle = "#1f2937"
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, radius)
    ctx.fill()

    // Nama
    ctx.fillStyle = "#22c55e"
    ctx.font = "bold 22px Sans"
    ctx.fillText(name, bubbleX + 20, bubbleY + 36)

    // Message
    ctx.fillStyle = "#ffffff"
    ctx.font = "18px Sans"
    wrapText(
      ctx,
      message,
      bubbleX + 20,
      bubbleY + 70,
      bubbleW - 40,
      26
    )

    res.setHeader("Content-Type", "image/jpeg")
    res.send(canvas.toBuffer("image/jpeg", { quality: 0.95 }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ")
  let line = ""

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " "
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y)
      line = words[i] + " "
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}

export default app
