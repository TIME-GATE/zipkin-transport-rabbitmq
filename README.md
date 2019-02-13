# Zipkin-transport-rabbitmq

This is a module that sends Zipkin trace data from zipkin-js to Rabbitmq.

## Usage:

`npm install zipkin-transport-rabbitmq --save`

```javascript
/* mq conection options */
const conectionOptions = {
  hostname: '127.0.0.1',
  port: 5672,
  username: 'admin',
  password: 'admin',
  authMechanism: 'AMQPLAIN',
  vhost: "admin",
  connectionTimeout: 1000,
  heartbeat: 60,
  ssl: {
    enabled: false,
  },
};

const {Tracer, ExplicitContext, BatchRecorder} = require('zipkin');
const {RabbitmqLogger, wrapRabbitmq, amqp} = require('zipkin-transport-rabbitmq');
const noop = require('noop-logger');

const recorder = new BatchRecorder({ logger: new RabbitmqLogger(conectionOptions, noop) });
const ctxImpl = new ExplicitContext(); // this would typically be a CLSContext or ExplicitContext
const localServiceName = 'service-a' // name of this application

const tracer = new Tracer({
  recorder,
  ctxImpl,
  localServiceName,
});

const zipkinRabbitmq = wrapRabbitmq(amqp, tracer, conectionOptions);

async function mqFn(config) {
  /* bing queue */
  await amqp.bindQueue(
    config.exchangeName,
    config.queueName,
    config.routingKey
  );

  /* produce */
  await amqp.produce(
    config.exchangeName,
    config.routingKey,
    new Buffer(JSON.stringify({msg: 'hello zipkin'}))
  );

  /* consume */
  await amqp.consume(
    config.queueName,
    (msg) => { console.log(mgs) },
  );
}

mqFn({
  exchangeName: 'demo-exchange',
  queueName: 'demo-queue',
  routingKey: 'demo-routing',
})
```