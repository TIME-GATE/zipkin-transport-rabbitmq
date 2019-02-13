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

const zipkinRabbitmq = wrapRabbitmq(amqp, tracer);

zipkinRabbitmq.consume('demo-queue', (msg) => {
  console.log(`mq message to zipkin ${msg}`)
},{ noAck: false},
);
```