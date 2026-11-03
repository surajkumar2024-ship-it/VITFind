import { PHOTO_TARGET_BYTES } from "./media-policy";

export async function compressPhoto(file: File, maxDimension: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 7; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw Error("Couldn’t prepare this photo. Please try another.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.5, 0.82 - attempt * 0.07);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(Error("Couldn’t read that photo.")), "image/jpeg", quality,
      ));
      if (blob.size <= PHOTO_TARGET_BYTES) return blob;
      scale *= 0.8;
    }
    throw Error("This photo is too detailed to upload. Please choose a smaller photo.");
  } finally { bitmap.close(); }
}
