const sharp = require("sharp");
const blurhash = require("blurhash");

const generateBlurhash = async (
  imageAbsolutePath,
  imageWidth,
  imageHeight,
  fieldArgs
) => {
  const { width, quality } = fieldArgs;

  const maskBuffer = await sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 1,
      },
    },
  })
    .composite([{ input: imageAbsolutePath, blend: "dest-in" }])
    .png()
    .toColorspace("b-w")
    .toBuffer();

  // A new pipeline is required since composite doesn't work after a resize
  const resizedMaskBuffer = await sharp(maskBuffer)
    .resize(width)
    .png({ quality })
    .toBuffer();

  return {
    base64Image: `data:image/png;base64,${resizedMaskBuffer.toString(
      "base64"
    )}`,
  };
};

module.exports = generateBlurhash;
