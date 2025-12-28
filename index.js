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

    // === FONT SIZE ===
    const nameFontSize = 20
    const messageFontSize = 18

    // === AVATAR (DIPERKECIL) ===
    const avatarSize = 60
    const avatarPadding = 16

    // === BUBBLE WIDTH ===
    const bubbleWidth = canvasSize - avatarSize - 90

    // === HITUNG TEXT ===
    ctx.font = `${messageFontSize}px XyzFont`
    const lines = wrapTextCalc(ctx, message, bubbleWidth - 40)
    const lineHeight = 24

    const bubbleHeight =
      60 + lines.length * lineHeight

    // === POSISI TENGAH ===
    const totalHeight = Math.max(avatarSize, bubbleHeight)
    const startY = (canvasSize - totalHeight) / 2

    const avatarX = 24
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

    // === BUBBLE BACKGROUND PUTIH ===
    ctx.fillStyle = "#ffffff"
    roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 22)
    ctx.fill()

    // === BORDER PUTIH ===
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 3
    ctx.stroke()

    // === NAMA (ORANYE REDUP, BOLD) ===
    ctx.fillStyle = "#d97706" // oranye redup
    ctx.font = `bold ${nameFontSize}px XyzFont`
    ctx.fillText(name, bubbleX + 20, bubbleY + 28)

    // === MESSAGE (HITAM, 11/12 SIZE) ===
    ctx.fillStyle = "#000000"
    ctx.font = `${messageFontSize}px XyzFont`
    drawWrappedText(
      ctx,
      message,
      bubbleX + 20,
      bubbleY + 54,
      bubbleWidth - 40,
      lineHeight
    )

    res.setHeader("Content-Type", "image/png")
    res.end(canvas.toBuffer("image/png"))
  } catch (e) {
    res.status(500).json({ status: false, message: e.message })
  }
})