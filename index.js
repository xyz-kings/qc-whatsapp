const express = require("express")
const path = require("path")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")

const app = express()
const PORT = process.env.PORT || 3000

// FONT CUSTOM
GlobalFonts.registerFromPath(
  path.join(__dirname, "xyzfont.ttf"),
  "XyzFont"
)

app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "QC WhatsApp API",
    endpoint: "/api/qc",
    example:
      "/api/qc?avatar=https://files.catbox.moe/wozyle.jpg&name=XyzKings&message=Haii+kucing+mewng"
  })
})

async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error("avatar gagal dimuat")
  return Buffer.from(await res.arrayBuffer())
}

app.get("/api/qc", async (req, res) => {
  try {
    const { avatar, name = "Unknown", message = "..." } = req.query
    if (!avatar) {
      return res.status(400).json({ status: false, message: "avatar wajib" })
    }

    // === CANVAS GEDE ===
    const canvasSize = 600
    const canvas = createCanvas(canvasSize, canvasSize)
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // === AVATAR ===
    const avatarSize = 72
    const avatarPadding = 24

    // === BUBBLE ===
    const bubbleWidth = canvasSize - avatarSize - 90

    // === FONT SUPER GEDE ===
    const nameSize = 32
    const msgSize = 28
    const lineHeight = 36

    ctx.font = `${msgSize}px XyzFont`
    const lines = wrapTextCalc(ctx, message, bubbleWidth - 56)

    const bubbleHeight =
      88 + lines.length * lineHeight

    const totalHeight = Math.max(avatarSize, bubbleHeight)
    const startY = (canvasSize - totalHeight) / 2

    const avatarX = 28
    const avatarY = startY
    const bubbleX = avatarX + avatarSize + avatarPadding
    const bubbleY = startY

    // === AVATAR ===
    const avatarBuffer = await fetchImageBuffer(avatar)
    const img = await loadImage(avatarBuffer)

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
    ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()

    // === BORDER PUTIH SUPER TEBAL ===
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 6
    roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 28)
    ctx.stroke()

    // === NAMA (ORANYE REDUP, GEDE BANGET) ===
    ctx.fillStyle = "#d97706"
    ctx.font = `bold ${nameSize}px XyzFont`
    ctx.fillText(name, bubbleX + 28, bubbleY + 42)

    // === MESSAGE (HITAM, HAMPIR SAMA GEDE) ===
    ctx.fillStyle = "#000000"
    ctx.font = `${msgSize}px XyzFont`
    drawWrappedText(
      ctx,
      message,
      bubbleX + 28,
      bubbleY + 84,
      bubbleWidth - 56,
      lineHeight
    )

    res.setHeader("Content-Type", "image/png")
    res.end(canvas.toBuffer("image/png"))
  } catch (e) {
    res.status(500).json({ status: false, message: e.message })
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

function wrapTextCalc(ctx, text, maxWidth) {
  const words = text.split(" ")
  const lines = []
  let line = ""

  for (const word of words) {
    const test = line + word + " "
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word + " "
    } else {
      line = test
    }
  }
  lines.push(line)
  return lines
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapTextCalc(ctx, text, maxWidth)
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })
}

if (!process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log(`QC API jalan → http://localhost:${PORT}`)
  )
}

module.exports = app