function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });
}

const MAX_OUTPUT_EDGE = 1024;


export async function getCroppedImg(
  imageSrc,
  pixelCrop,
  mimeType = "image/jpeg",
  quality = 0.92
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  let outW = pixelCrop.width;
  let outH = pixelCrop.height;
  const maxEdge = Math.max(outW, outH);
  if (maxEdge > MAX_OUTPUT_EDGE) {
    const scale = MAX_OUTPUT_EDGE / maxEdge;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Canvas export failed"));
        else resolve(blob);
      },
      mimeType,
      quality
    );
  });
}
