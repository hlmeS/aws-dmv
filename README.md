# AWS-DMV project
 The purpose of this document is to walkthrough the steps required to build an image recognition system through Amazon Web Services. This AWS system was built for use in the Hawaii DMV system for the purpose of reading and outputting text-in-image, specifically, reading text in the images of the documents required for driver’s license applications. 
  This system allows users to upload images of their documents to your site, those images are then saved in an S3 bucket, those images are then pulled by Amazon Rekognition and read, and finally the text read from those images are outputted and saved in a DynamoDB.

# Tutorial
## Prerequisites
1. NodeJS
2. AWS account
3. webpage that can image upload

## Setup
1. Install serverless cli tool `npm install -g serverless`
follow [these instructions](https://serverless.com/framework/docs/providers/aws/guide/credentials/) for logging into your AWS account 
2. Create a new project directory and initialize using `npm init`
3. Install dependencies
```
  "aws-sdk"
  "body-parser"
  "express"
  "serverless-http"
  "uuid"
```

## setup serverless project
in root directory, create `serverless.yml` which serverless CLI will use to provision resources on AWS.


```
# serverless.yml
service: aws-dmv-rekog

custom: 
  tableName: 'dmv-users-table-${self:provider.stage}'

provider:
  name: aws
  runtime: nodejs8.10
  stage: dev
  region: us-east-1
  iamRoleStatements:
    - Effect: "Allow"
      Action:
        - "rekognition:*"
      Resource:
        - "*"
    - Effect: "Allow"
      Action:
        - "s3:GetObject*"
        - "s3:ListBucket"
      Resource:
        - "arn:aws:s3:::slackers-dmv-rekog-2019"
        - "arn:aws:s3:::slackers-dmv-rekog-2019/*"
    - Effect: Allow
      Action: 
        - dynamodb:Query
        - dynamodb:Scan
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:UpdateItem
        - dynamodb:DeleteItem
      Resource:
        - { "Fn::GetAtt": ["DmvUserTable", "Arn"] }
  environment:
    USERS_TABLE: ${self:custom.tableName}
```
this portion of `serverless.yml` is setting up the project and telling AWS which resources we will have access to act on. Listed under iamRoleStatements, this project has access to: 
  * rekogition (all)
  * S3 (get object & list bucket)
  * DynamoDB 

Our two functions must be defined in `serverless.yml` so that the CLI knows how to set them up. 
```
# serverless.yml
service: aws-dmv-rekog
...
...

functions:
  app:
    handler: handler.app
    events:
      - http: ANY /
      - http: 'ANY {proxy+}'
  textFromImage:
    handler: "handler.textFromImage"
    events:
      - s3:
        bucket: "slackers-dmv-rekog-2019"
        event: "s3:ObjectCreated:*"
        rules:
          - prefix: "university/"

```
Here we define 2 functions, app and handler. 
App: 
When a client visits the http endpoint for app, lambda runs a function containing a webserver that will return a webpage to the client. This webpage will allow the user to upload images. 

textFromImage:  
A lambda function that listens for `objectCreated` events. Once triggered,
passes event data to rekognition, receives a result and parses for the information it wants. Writes data to a DynamoDB database.

We'll need to provision and setup DynamoDB as a resource, so add this under your function declarations in `serverless.yml`.
```
# serverless.yml
service: aws-dmv-rekog
...
...

resources:
 Resources:
  DmvUserTable:
    Type: 'AWS::DynamoDB::Table'
    Properties:
      AttributeDefinitions:
        -
          AttributeName: userId
          AttributeType: "S"
      KeySchema:
        -
          AttributeName: userId
          KeyType: HASH
      ProvisionedThroughput:
        ReadCapacityUnits: 1
        WriteCapacityUnits: 1
      TableName: ${self:custom.tableName}
```
Here we have listed a DynamoDB table as a resource and defined attributes that are required for the table. `userId` will be a String("S") attribtue that is required as a unique identifier of each document that is added to the table. 

In the root of our proejct create the following
- handlers/ (lambda functions will go here)
- src/ (other code to support the handlers)
- handler.js (used to export all of our functions at once)

In `handler.js`
```
'use strict';

module.exports = {
  index: require('./handlers/index'),
  textFromImage: require('./handlers/textFromImage')
}
```

Lets create our first function handler as a file `handlers/textFromImage.js`
```
const rekogDetectText = require('../src/rekogDetectText')
const saveToDynamo = require('../src/saveToDynamo')
module.exports = textFromImage
  const s3config = {
    bucket: bucket,
    key: key
  }
  
  const resultPromise = rekogDetectText(s3config); // returns a promise
  resultPromise.then( value => {
    // save to database
    const fields = value.TextDetections;
    const doc = {
      lastName: findById(31),
      firstName: findById(29),
      expiration: findById(25),
      birthday: findById(41),
    }
    saveToDynamo(doc);

    function findById(fieldId) {
      return fields.find((val) => {
        return val.Id === fieldId;
      }).DetectedText
    }
  })

  callback(null, "success");
```
This handler file is the actual lambda function that will be uploaded and called. Handlers must be defined with 3 arguments. 'event', 'context', and 'callback'. For our use, we will be focusing only on 'event'. 

The event being passed is the S3 object created event. We know this becuase it was defined in `serverless.yml` under 'functions'. We extract the bucket and key of the image from the event to send to rekognition. 

We'll then call a function that makes the rekognition call in another file and pass it the config. 
Once the promise resolves we will take the rekognition response value and parse it for the information we want, then call another function `saveToDynamo()` which we'll define in another file. 


```
// rekogDetectText.js
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
}

```
We start by requiring the AWS sdk so that we can have access to rekognition and save it to a variable.

We construct an object of the data we want to pass to rekognition called `params`. This contains a nested object that says the name of the image, and S3 bucket it is in.

We wrap our rekognition call in a promise to make sure that rekognition completes and returns a value before returning a result to the lambda function. In the rekognition call we pass the params we created as well as a callback for how to handle the result of the promise.

`rekognition.detectText()` is the function for the image text detection service within rekognition.

```
// saveToDynamo.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();
const uuidv1 = require('uuid/v1');

module.exports = saveToDynamo

function saveToDynamo(doc) {
  const params = {
    Item: {
      "userId": {
        S: uuidv1()
      },
      "firstName": {
        S: doc.firstName
      },
      "lastName": {
        S: doc.lastName
      },
      "expiration": {
        S: doc.expiration
      },
      "birthday": {
        S: doc.birthday
      }
    },
    ReturnConsumedCapacity: "TOTAL",
    TableName: 'dmv-users-table-dev',
  }

  dynamodb.putItem(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data); 
  })
}
```

This function will be used for saving rekognition results to AWS DynamoDB.  We use the uuid library to assign each result a new unique Identifier for the userId required field.

We create the structure for how data will be saved to Dynamo, then we map each attribute of the doc argument to the params we will insert to Dynamo. 

We call dynamodb.putItem with these params to insert a new record. 

## Deploy 

To deploy our newly created project we will call
`sls deploy`

## Usage
After deploying, an API endpoint should get output to your console. Visit that to go to the website you created. Upload your image. Your lambda function should get fired off. 
Visit dynamoDB to see your new record. 

## Testing
In lambda, you can configure test events to mimic a real objectCreated event. This will save you time in development and give you instant feedback. 
1. Upload an image to your S3 bucket that you will be listening at
2. Go to your lambda function in the AWS console
3. On the top of the page, select 'configure test event'
4. Save this test event 
```
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "aws:s3",
      "awsRegion": "us-west-2",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "userIdentity": {
        "principalId": "AIDAJDPLRKLG7UEXAMPLE"
      },
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "responseElements": {
        "x-amz-request-id": "C3D13FE58DE4C810",
        "x-amz-id-2": "FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD"
      },
      "s3": {
        "s3SchemaVersion": "1.0",
        "configurationId": "testConfigRule",
        "bucket": {
          "name": "YOUR_BUCKET_NAME",
          "ownerIdentity": {
            "principalId": "4bba330f2a92c0b54d2e7b31190489b625e4e82b84197cceb874ac6516245da5"
          },
          "arn": "YOUR_BUCKET_ARN"
        },
        "object": {
          "key": "YOUR_IMAGE.jpg"
        }
      }
    }
  ]
}
```
click save and then test to see your glorious function in action.