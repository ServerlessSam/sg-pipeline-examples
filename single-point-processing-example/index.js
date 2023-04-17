'use strict';

const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const jimp = require('jimp');

/**
 * Used to identify if a PNG is a dog or cat
 *
 * @param {String} bucket_name name of S3 bucket
 * @param {String} key key name within bucket (including prefix)
 * @returns {Promise<String>} string of "Dog", "Cat" or "Neither"
 */
async function dogOrCat(bucket_name, key) {
  const client = new RekognitionClient({ region: process.env.REGION });

  const params = {
    Image: {
      S3Object: {
        Bucket: bucket_name,
        Name: key,
      },
    },
    MinConfidence: 50,
    Settings: {
      GeneralLabels: {
        LabelInclusionFilters: ["Dog", "Cat"],
      },
    },
  };
  const command = new DetectLabelsCommand(params);

  const data = await client.send(command);

  if (data.Labels.length > 0) {
    console.log(
      `I am ${data.Labels[0].Confidence}% sure this is a ${data.Labels[0].Name}!`
    );
    return data.Labels[0].Name;
  } else {
    return "Neither";
  }
}

/**
 * Used to resize a PNG to 400x400
 *
 * @param {String} bucket_name name of S3 bucket
 * @param {String} key key name within bucket (including prefix)
 * @param {String} animal either "dog" or "cat". This should be the prefix within the S3 bucket
 * @returns {Promise<String>} full arn of new object in S3
 */
const resize_and_save = async (bucket_name, key, animal) => {
  const client = new S3Client({ region: process.env.REGION });
  const input = {
    Bucket: bucket_name,
    Key: key,
  };
  const command = new GetObjectCommand(input)
  const viewUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  console.log(viewUrl)
  const image = await jimp.read(viewUrl);
  const bufferData = await image.resize(400,400).getBufferAsync("image/" +"png")

  // save resized image to S3 bucket
  const destination_key = `${animal}/${key.split("/").pop()}`
  await client.send(new PutObjectCommand({ Bucket: bucket_name, Key: destination_key, Body: bufferData }));
  console.log(`Successfully resized and saved image ${destination_key}`);
  return `arn:aws:s3:::${bucket_name}/${destination_key}`
};

/**
 * Used to write a record to the RDS DB
 *
 * @param {String} obj_arn full arn of resized image.
 * @param {String} animal either "dog" or "cat". This should be the prefix within the S3 bucket
 */
const persist_record_to_db = (obj_arn, animal) => {
  return;
};

const handler = async (event) => {
  console.log(event);
  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  //const animal = await dogOrCat(bucket, key);
  const animal = "dog";
  const new_resized_obj_arn = await resize_and_save(bucket, key, animal);
  persist_record_to_db(new_resized_obj_arn, animal);

  const msg = `Image of a ${animal} saved at ${new_resized_obj_arn}!`;

  return {
    body: msg,
  };
};

module.exports = {
  handler,
};
