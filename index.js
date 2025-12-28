const express = require("express")
const { createCanvas, loadImage } = require("@napi-rs/canvas")

const app = express()

app.get("/api/qc", async (req, res) => {
  const { avatar, name = "Unknown", message = "..." } = req.query
  if (!avatar) return res.status(400).send("avatar wajib")

  const size = 512
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  ctx.clearRect(0, 0, size, size)

  // avatar
  const img = await loadImage(avatar)
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

  ctx.fillStyle = "#fff"
  ctx.font = "18px Sans"
  wrapText(ctx, message, 180, 90, 280, 26)

  res.setHeader("Content-Type", "image/jpeg")
  res.end(canvas.toBuffer("image/jpeg"))
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

function wrapText(ctx, text, x, y, max, lh) {
  let line = ""
  for (const word of text.split(" ")) {
    const test = line + word + " "
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, y)
      line = word + " "
      y += lh
    } else line = test
  }
  ctx.fillText(line, x, y)
}

module.exports = app