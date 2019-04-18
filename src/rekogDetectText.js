const AWS = require('aws-sdk');
const rekognition = new AWS.Rekognition();

module.exports = rekogDetectText

function rekogDetectText({bucket, key}) {
  const params = {
    Image: { /* required */
      S3Object: {
        Bucket: bucket,
        Name: `university/${key}`, 
      }
    }
  };

  // console.log(params);  

  return new Promise((res, rej) => {
    rekognition.detectText(params, function(err, data) {
      if(err) {
        return rej(new Error(err));
      } 
        // console.log(data);
        return res(data);
      });
  });

  // rekognition.detectText(params, function(err, data) {
  //   if (err) console.log(err, err.stack); // an error occurred
  //   else     return data;           // successful response
  // });
}
