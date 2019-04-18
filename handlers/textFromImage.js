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
  // const resultPromise = new Promise((res, rej) => {
  //   return res(rekogDetectText(s3config));
  // })
  
  
  const resultPromise = rekogDetectText(s3config); // returns a promise
  resultPromise.then( value => {
    // save to database
    console.log(value);
  })


  callback(null, "success");
};
