"use strict";

const {
  getImageSizeAsync
} = require("gatsby-plugin-sharp");

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} = require("gatsby/graphql");

const Debug = require("debug");

const {
  default: PQueue
} = require(`p-queue`);

const {
  createContentDigest
} = require("gatsby-core-utils");

const generateImageMask = require("./generate-image-mask");

const queue = new PQueue({
  concurrency: 1
});
const debug = Debug("gatsby-plugin-image-mask");

module.exports = async args => {
  const {
    type: {
      name
    }
  } = args;

  if (name === "ImageSharp") {
    return imageMask(args);
  }

  return {};
};

async function imageMask(args) {
  debugger;
  const {
    cache,
    getNodeAndSavePathDependency
  } = args;
  return {
    imageMask: {
      type: new GraphQLObjectType({
        name: "ImageMask",
        fields: {
          base64Image: {
            type: GraphQLString
          }
        }
      }),
      args: {
        width: {
          type: GraphQLInt,
          defaultValue: 128
        },
        quality: {
          type: GraphQLInt,
          defaultValue: 20
        }
      },

      async resolve(image, fieldArgs, context) {
        const file = getNodeAndSavePathDependency(image.parent, context.path);
        const {
          width: originalImageWidth,
          height: originalImageHeight
        } = await getImageSizeAsync(file);
        const {
          name
        } = file;
        const {
          contentDigest
        } = file.internal;
        const cacheKey = `${contentDigest}${createContentDigest(fieldArgs)}`;
        debug(`Request image mask generation for ${name} (${cacheKey})`);
        return queue.add(async () => {
          let cachedResult = await cache.get(cacheKey);

          if (cachedResult) {
            debug(`Using cached data for ${name} (${cacheKey})`);
            return cachedResult;
          }

          try {
            debug(`Executing image mask generation request for ${name} (${cacheKey})`);
            const result = await generateImageMask(file.absolutePath, originalImageWidth, originalImageHeight, fieldArgs);
            await cache.set(cacheKey, result);
            return result;
          } catch (err) {
            err.message = `Unable to generate image mask for ${name} (${cacheKey})\n${err.message}`;
            throw err;
          }
        });
      }

    }
  };
}