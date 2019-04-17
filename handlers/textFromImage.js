// takes Identification card from S3 and passes to rekog. console log returned data. 
const rekogDetectText = require('../src/rekogDetectText')
module.exports = textFromImage

function textFromImage(event, context, callback) {
  // create config to find specific image for the event. 
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  const s3config = {
    bucket: bucket,
    key: key
  }
  // // call rekognition
  const result = rekogDetectText(s3config);
  console.log(result);
};
