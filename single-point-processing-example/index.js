

const dogOrCat = (bucketName, key) => {
  return "dog"
}

const resize = (bucketName, key) => {
  return true
}

const handler = async (event) => {
  let statusCode = 200;
  let message = "hello world!";

  return {
    statusCode,
    body: JSON.stringify({
      message,
    }),
  };
};

module.exports = {
  handler
};
