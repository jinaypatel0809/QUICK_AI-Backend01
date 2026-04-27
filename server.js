app.post('/api/remove-object/process', async (req, res) => {
  try {
    const { imageBase64, originalName, objectDescription } = req.body;

    if (!imageBase64 || !originalName || !objectDescription?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'imageBase64, originalName ane objectDescription jaruri che.',
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // ✅ Dynamic imports (allowed)
    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;

    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    form.append('output_format', 'png');

    const stabilityRes = await fetch(
      'https://api.stability.ai/v2beta/stable-image/edit/erase',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: 'image/*',
          ...form.getHeaders(),
        },
        body: form,
      }
    );

    if (!stabilityRes.ok) {
      const errText = await stabilityRes.text();
      console.error('❌ Stability AI Error:', errText);
      return res.status(502).json({
        success: false,
        message: 'Stability AI API error: ' + errText,
      });
    }

    const arrayBuf = await stabilityRes.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuf);
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    const record = new RemovedObject({
      originalName,
      objectDescription: objectDescription.trim(),
    });

    await record.save();

    return res.status(201).json({
      success: true,
      message: 'Object removed successfully!',
      resultImageBase64: resultBase64,
      record,
    });

  } catch (error) {
    console.error('❌ Remove Object Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Remove object ma error avyo: ' + error.message,
    });
  }
});
