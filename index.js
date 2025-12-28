const express = require("express")
const path = require("path")
const fetch = require("node-fetch")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")

const app = express()
const PORT = process.env.PORT || 3000

// LOAD FONT
GlobalFonts.registerFromPath(
  path.join(__dirname, "xyzfont.ttf"),
  "XyzFont"
)

// ROOT INFO
app.get("/", (req, res) => {
  res.json({
    status: true,
    endpoint: "/api/qc",
    example:
      "http://localhost:3000/api/qc?avatar=https://files.catbox.moe/wozyle.jpg&name=XyzKings&message=Haii+kucing+mewng"
  })
})

// FETCH AVATAR
async function getImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  })
  if (!res.ok) throw new Error("Avatar gagal diambil")
  return Buffer.from(await res.arrayBuffer())
}

// QC ENDPOINT
app.get("/api/qc", async (req, res) => {
  try {
    const { avatar, name = "Unknown", message = "..." } = req.query
    if (!avatar) {
      return res.status(400).json({ status: false, message: "avatar wajib" })
    }

    const canvasSize = 512
    const canvas = createCanvas(canvasSize, canvasSize)
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // SIZE SETTING
    const avatarSize = 56
    const padding = 16
    const bubbleWidth = canvasSize - avatarSize - 90

    // TEXT SIZE
    const nameSize = 20
    const msgSize = 18
    const lineHeight = 24

    ctx.font = `${msgSize}px XyzFont`
    const lines = wrapText(ctx, message, bubbleWidth - 40)
    const bubbleHeight = 60 + lines.length * lineHeight

    const startY = (canvasSize - Math.max(avatarSize, bubbleHeight)) / 2

    const avatarX = 24
    const avatarY = startY
    const bubbleX = avatarX + avatarSize + padding
    const bubbleY = startY

    // AVATAR
    const avatarBuf = await getImage(avatar)
    const img = await loadImage(avatarBuf)

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

    // BUBBLE BACKGROUND
    ctx.fillStyle = "#ffffff"
    drawRoundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 22)
    ctx.fill()

    // BORDER
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 3
    ctx.stroke()

    // NAME
    ctx.fillStyle = "#d97706" // oranye redup
    ctx.font = `bold ${nameSize}px XyzFont`
    ctx.fillText(name, bubbleX + 20, bubbleY + 28)

    // MESSAGE
    ctx.fillStyle = "#000000"
    ctx.font = `${msgSize}px XyzFont`
    drawText(ctx, message, bubbleX + 20, bubbleY + 54, bubbleWidth - 40, lineHeight)

    res.setHeader("Content-Type", "image/png")
    res.end(canvas.toBuffer("image/png"))
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: false, error: err.message })
  }
})

// TEXT WRAP
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ")
  const lines = []
  let line = ""

  for (const w of words) {
    const test = line + w + " "
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = w + " "
    } else {
      line = test
    }
  }
  lines.push(line)
  return lines
}

function drawText(ctx, text, x, y, maxWidth, lh) {
  const lines = wrapText(ctx, text, maxWidth)
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh))
}

function drawRoundRect(ctx, x, y, w, h, r) {
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

// LOCALHOST
if (!process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log(`QC API jalan → http://localhost:${PORT}`)
  )
}

module.exports = app