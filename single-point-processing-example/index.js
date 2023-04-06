'use strict';

const {
  RekognitionClient,
  DetectLabelsCommand,
} = require("@aws-sdk/client-rekognition");

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const { Upload } = require("@aws-sdk/lib-storage");

const Sharp = require('sharp');

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
  try {
    console.log("Entered resize");
    console.log(bucket_name, key);
    const client = new S3Client({ region: process.env.REGION });
    const input = {
      Bucket: bucket_name,
      Key: key,
    };
    const getCommand = new GetObjectCommand(input);
    const file = await client.send(getCommand);
    console.log("Fetched File");
    const streamResize = Sharp()
          .resize(400, 400)
          .toFormat('png')
    const upload = new Upload({
      client: client,
      params: {
        Bucket: bucket_name,
        Key: "processed/" + animal + "/" + key.split("/").slice(-1)[0],
        Body: file.Body.pipe(streamResize),
        ContentType: "image/png",
      },
    });
    const response = await upload.done();
    console.log(response);
    return "arn:aws:s3:::" + response.Bucket + "/" + response.Key;
  } catch (error) {
    console.log(error);
    return null;
  }
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
