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
  console.log(params);

  dynamodb.putItem(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data); 
  })
}
