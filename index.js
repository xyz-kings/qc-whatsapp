const express = require("express")
const { createCanvas, loadImage } = require("@napi-rs/canvas")

const app = express()

/* ROOT INFO */
app.get("/", (req, res) => {
  res.json({
    status: true,
    name: "QC WhatsApp API",
    description: "API untuk membuat QC (Quote Chat) sticker WhatsApp",
    endpoint: "/api/qc",
    method: "GET",
    response: "image/jpeg",
    params: {
      avatar: {
        required: true,
        description: "URL foto profil WhatsApp"
      },
      name: {
        required: false,
        description: "Nama WhatsApp"
      },
      message: {
        required: false,
        description: "Isi pesan"
      }
    },
    example: {
      url: "https://qc-whatsapp.vercel.app/api/qc?avatar=https://telegra.ph/file/xxxx.jpg&name=Dayra&message=QC+stiker+WA"
    }
  })
})

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

    // Avatar kiri
    const img = await loadImage(avatar)
    ctx.save()
    ctx.beginPath()
    ctx.arc(80, 80, 48, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, 32, 32, 96, 96)
    ctx.restore()

    // Bubble kanan
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
  } catch (e) {
    res.status(500).json({
      status: false,
      message: e.message
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

function wrapText(ctx, text, x, y, max, lh) {
  let line = ""
  for (const word of text.split(" ")) {
    const test = line + word + " "
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, y)
      line = word + " "
      y += lh
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, y)
}

module.exports = app