const { PubSub } = require("@google-cloud/pubsub");

// Creates a client; cache this for further use
const pubSubClient = new PubSub();

async function publish(
  topicNameOrId = "sportsbook",
  message = JSON.stringify({ foo: "bar" }),
) {
  // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
  const messageBuffer = Buffer.from(message);

  try {
    const messageId = await pubSubClient
      .topic(topicNameOrId)
      .publishMessage(messageBuffer);
    const result = {
      published: true,
      topicNameOrId,
      messageId,
      message,
      messageBuffer,
    };
    console.log({ pubsub_publish_result: result });
    return result;
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    return {
      error: "x-pubsub-publish-error",
      firebaseError: error,
      topicNameOrId,
      messageBuffer,
    };
    // process.exitCode = 1;
  }
}

const pub = publish;
const subscribe = (topicNameOrId, callback) => {
  return pubSubClient.topic(topicNameOrId).onPublish(callback);
};
const sub = subscribe;
const pubsub = pubSubClient;

module.exports = {
  pubSubClient,
  pubsub,
  publish,
  pub,
  subscribe,
  sub,
};

// /**
//  * /**
//  * Publishes a message to a Cloud Pub/Sub Topic.
//  *
//  * @example
//  * gcloud functions call publish --data '{"topic":"[YOUR_TOPIC_NAME]","message":"Hello, world!"}'
//  *
//  *   - Replace `[YOUR_TOPIC_NAME]` with your Cloud Pub/Sub topic name.
//  *
//  * @param {object} req Cloud Function request context.
//  * @param {object} req.body The request body.
//  * @param {string} topic Topic name on which to publish.
//  * @param {string} message Message to publish.
//  * @param {object} res Cloud Function response context.
//  */
//  */
