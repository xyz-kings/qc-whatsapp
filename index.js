const express = require("express")
const path = require("path")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")

const app = express()
const PORT = process.env.PORT || 3000

// === LOAD FONT CUSTOM ===
GlobalFonts.registerFromPath(
  path.join(__dirname, "xyzfont.ttf"),
  "XyzFont"
)

/* ROOT INFO */
app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "QC WhatsApp API",
    endpoint: "/api/qc",
    note: "Background transparan, font custom, border auto-size",
    example: `http://localhost:${PORT}/api/qc?avatar=https://files.catbox.moe/wozyle.jpg&name=XyzKings&message=Haii+kucing+mewng`
  })
})

/* FETCH IMAGE BUFFER */
async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error("gagal ambil avatar")
  return Buffer.from(await res.arrayBuffer())
}

/* QC ENDPOINT */
app.get("/api/qc", async (req, res) => {
  try {
    const { avatar, name = "Unknown", message = "..." } = req.query
    if (!avatar) {
      return res.status(400).json({ status: false, message: "avatar wajib" })
    }

    // === CANVAS ===
    const canvasSize = 512
    const canvas = createCanvas(canvasSize, canvasSize)
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvasSize, canvasSize) // TRANSPARAN

    // === FONT SETTING ===
    ctx.font = "16px XyzFont"

    // === AVATAR SIZE (LEBIH KECIL) ===
    const avatarSize = 72
    const avatarPadding = 20

    // === BUBBLE WIDTH ===
    const bubbleWidth = canvasSize - avatarSize - 80

    // === HITUNG TINGGI TEXT ===
    const textLines = wrapTextCalc(ctx, message, bubbleWidth - 40)
    const lineHeight = 22
    const bubbleHeight =
      50 + textLines.length * lineHeight

    // === POSISI TENGAH ===
    const totalHeight = Math.max(avatarSize, bubbleHeight)
    const startY = (canvasSize - totalHeight) / 2

    const avatarX = 20
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

    // === BORDER PUTIH ===
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 3
    roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 20)
    ctx.stroke()

    // === NAME ===
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 18px XyzFont"
    ctx.fillText(name, bubbleX + 20, bubbleY + 28)

    // === MESSAGE ===
    ctx.font = "16px XyzFont"
    drawWrappedText(
      ctx,
      message,
      bubbleX + 20,
      bubbleY + 55,
      bubbleWidth - 40,
      lineHeight
    )

    res.setHeader("Content-Type", "image/png")
    res.end(canvas.toBuffer("image/png"))
  } catch (e) {
    res.status(500).json({ status: false, message: e.message })
  }
})

/* UTIL */
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

/* LOCAL LISTEN */
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`QC API running → http://localhost:${PORT}`)
  })
}

module.exports = app