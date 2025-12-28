const express = require("express")
const { createCanvas, loadImage } = require("@napi-rs/canvas")

const app = express()

const PORT = process.env.PORT || 3000

/* ROOT INFO */
app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "QC WhatsApp API (Local Test)",
    endpoint: "/api/qc",
    example: `http://localhost:${PORT}/api/qc?avatar=https://files.catbox.moe/wozyle.jpg&name=XyzKings&message=Haii+kucing+mewng`
  })
})

/* HELPER FETCH IMAGE */
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
      return res.status(400).json({
        status: false,
        message: "parameter avatar wajib"
      })
    }

    const size = 512
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, size, size)

    // avatar
    const avatarBuffer = await fetchImageBuffer(avatar)
    const img = await loadImage(avatarBuffer)

    ctx.save()
    ctx.beginPath()
    ctx.arc(80, 80, 48, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, 32, 32, 96, 96)
    ctx.restore()

    // bubble
    ctx.fillStyle = "#1f2937"
    roundRect(ctx, 160, 32, 320, 220, 24)
    ctx.fill()

    ctx.fillStyle = "#22c55e"
    ctx.font = "bold 22px Sans"
    ctx.fillText(name, 180, 60)

    ctx.fillStyle = "#ffffff"
    ctx.font = "18px Sans"
    wrapText(ctx, message, 180, 90, 280, 26)

    res.setHeader("Content-Type", "image/jpeg")
    res.end(canvas.toBuffer("image/jpeg", { quality: 0.95 }))
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
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
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y)
      line = words[i] + " "
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}

/* =========================
   LISTEN LOCAL ONLY
========================= */
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`QC API running at http://localhost:${PORT}`)
  })
}

module.exports = app