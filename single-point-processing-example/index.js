
/**
 * Used to identify if a PNG is a dog or cat
 *
 * @param {String} bucket_name name of S3 bucket
 * @param {String} key key name within bucket (including prefix)
 * @returns {String} string of dog or cat
 */
const dogOrCat = (bucketName, key) => {
  return "dog"
}

/**
 * Used to resize a PNG to 400x400
 *
 * @param {String} bucket_name name of S3 bucket
 * @param {String} key key name within bucket (including prefix)
 * @param {String} animal either "dog" or "cat". This should be the prefix within the S3 bucket
 * @returns {String} full arn of new object in S3
 */
const resize_and_save = (bucket_name, key, animal) => {
  return "arn:aws:s3:::foo/bar"
}

/**
 * Used to write a record to the RDS DB
 *
 * @param {String} obj_arn full arn of resized image.
 * @param {String} animal either "dog" or "cat". This should be the prefix within the S3 bucket
 */
const persist_record_to_db = (obj_arn, animal) => {
  return
}

const handler = async (event) => {

  // Get the object from the event and show its content type
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  console.log(key) //debug
  console.log(bucket) //debug
  
  const animal = dogOrCat(bucket, key)
  const new_resized_obj_arn = resize_and_save(bucket, key, animal)
  persist_record_to_db(new_resized_obj_arn, animal)

  const msg = `Image of a ${animal} saved at ${new_resized_obj_arn}!`

  return {
    body: msg
  };
};

module.exports = {
  handler
};
