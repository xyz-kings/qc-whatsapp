const express = require("express")
const path = require("path")
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")

const app = express()
const PORT = process.env.PORT || 3000

GlobalFonts.registerFromPath(
  path.join(__dirname, "xyzfont.ttf"),
  "XyzFont"
)

app.get("/", (req, res) => {
  res.json({
    status: true,
    endpoints: {
      v1: "/api/qc/v1",
      v2: "/api/qc/v2"
    }
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

function qcHandler(version) {
  return async (req, res) => {
    try {
      const { avatar, name = "Unknown", message = "..." } = req.query
      if (!avatar)
        return res.status(400).json({ status: false, message: "avatar wajib" })

      /* ===== CANVAS ===== */
      const canvasSize = 820
      const canvas = createCanvas(canvasSize, canvasSize)
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvasSize, canvasSize)

      /* ===== CONFIG ===== */
      const avatarSize = 104
      const gap = 36
      const bubbleWidth = canvasSize - avatarSize - 180

      const nameSize = 64
      const msgSize = 60
      const lineHeight = 70

      const PADDING = 24
      const SECTION_GAP = 28      // ✅ jarak dipendekin
      const CONTENT_OFFSET_Y = 36
      const TEXT_SHIFT_X = 18     // ✅ geser kanan
      const MESSAGE_PUSH = 10

      /* ===== TEXT MEASURE ===== */
      ctx.font = `${msgSize}px XyzFont`
      const msgLines = wrapTextCalc(ctx, message, bubbleWidth - 48)

      const nameAreaHeight = nameSize + 26
      const msgAreaHeight = msgLines.length * lineHeight + 20

      const bubbleHeight =
        nameAreaHeight + SECTION_GAP + msgAreaHeight

      /* ===== POSITION ===== */
      const startY =
        (canvasSize - Math.max(avatarSize, bubbleHeight)) / 2

      const avatarX = 44
      const avatarY = startY
      const bubbleX = avatarX + avatarSize + gap
      const bubbleY = startY

      /* ===== AVATAR ===== */
      const img = await loadImage(await fetchImageBuffer(avatar))
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

      /* ===== BUBBLE ===== */
      ctx.fillStyle = version === "v1" ? "#ffffff" : "#000000"
      roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 40)
      ctx.fill()

      /* ===== NAME ===== */
      ctx.fillStyle = "#d97706"
      ctx.font = `bold ${nameSize}px XyzFont`
      ctx.fillText(
        name,
        bubbleX + PADDING + TEXT_SHIFT_X,
        bubbleY + nameSize + CONTENT_OFFSET_Y
      )

      /* ===== MESSAGE ===== */
      ctx.fillStyle = version === "v1" ? "#000000" : "#ffffff"
      ctx.font = `${msgSize}px XyzFont`
      drawWrappedText(
        ctx,
        message,
        bubbleX + PADDING + TEXT_SHIFT_X,
        bubbleY +
          nameAreaHeight +
          SECTION_GAP +
          CONTENT_OFFSET_Y +
          MESSAGE_PUSH,
        bubbleWidth - 48,
        lineHeight
      )

      res.setHeader("Content-Type", "image/png")
      res.end(canvas.toBuffer("image/png"))
    } catch (e) {
      res.status(500).json({ status: false, message: e.message })
    }
  }
}

app.get("/api/qc/v1", qcHandler("v1"))
app.get("/api/qc/v2", qcHandler("v2"))

/* ===== UTIL ===== */
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
  wrapTextCalc(ctx, text, maxWidth).forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight)
  })
}

if (!process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log(`QC API jalan → http://localhost:${PORT}`)
  )
}

module.exports = app