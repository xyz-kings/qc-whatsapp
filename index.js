const express = require("express")
const { createCanvas, loadImage } = require("canvas")

const app = express()

app.get("/api/qc", async (req, res) => {
  try {
    const avatar = req.query.avatar
    const name = req.query.name || "Unknown"
    const message = req.query.message || "..."

    if (!avatar) {
      return res.status(400).json({ error: "avatar wajib" })
    }

    const size = 512
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, size, size)

    // Avatar kiri
    const avatarImg = await loadImage(avatar)
    const avatarSize = 96

    ctx.save()
    ctx.beginPath()
    ctx.arc(80, 80, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImg, 32, 32, avatarSize, avatarSize)
    ctx.restore()

    // Bubble kanan
    const bubbleX = 160
    const bubbleY = 32
    const bubbleW = 320
    const bubbleH = 220
    const r = 24

    ctx.fillStyle = "#1f2937"
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, r)
    ctx.fill()

    // Nama
    ctx.fillStyle = "#22c55e"
    ctx.font = "bold 22px Sans"
    ctx.fillText(name, bubbleX + 20, bubbleY + 36)

    // Text
    ctx.fillStyle = "#ffffff"
    ctx.font = "18px Sans"
    wrapText(ctx, message, bubbleX + 20, bubbleY + 70, bubbleW - 40, 26)

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
    const test = line + words[i] + " "
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y)
      line = words[i] + " "
      y += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, y)
}

module.exports = app