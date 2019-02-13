/* eslint-disable no-console */
const {Tracer, BatchRecorder, Annotation, ExplicitContext} = require('zipkin');
const { RabbitmqLogger, amqb } = require('../src/index');

const localServiceName = 'service-a';
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

const config = {
  exchangeName: 'demo-exchange',
  queueName: 'demo-queue',
  routingKey: 'demo-routing',
}

function getRabbitmq(tracer) {
  return new RabbitmqLogger(tracer, amqb, conectionOptions);
}

describe('Rabbitmq transport - integration test', () => {
  it('should send tarce data to Rabbitmq', async (done) => {
    this.slow(10 * 1000);
    this.timeout(60 * 1000);

    const ctxImpl = new ExplicitContext();
    const recorder = new BatchRecorder({ logger: new RabbitmqLogger(conectionOptions, noop) });    
    const tracer = new Tracer({ctxImpl, recorder, localServiceName});

    const amqpInstance = getRabbitmq(tracer)

    tracer.setId(tracer.createRootId());

    await amqpInstance.bindQueue(
      config.exchangeName,
      config.queueName,
      config.routingKey
    );

    await amqpInstance.produce(
      config.exchangeName,
      config.routingKey,
      new Buffer(JSON.stringify({msg: 'hello zipkin'}))
    );

    await amqpInstance.consume(
      config.queueName,
      (msg) => { 
        console.log(mgs);
        expect(mgs).to.equal('hello zipkin')
      },
    );

    const annotations = recorder.record.args.map(args => args[0]);
    const firstAnn = annotations[0];
    expect(annotations).to.have.length(10);

    // we expect two spans, run annotations tests for each
    runTest(annotations.slice(0, annotations.length / 2));
    runTest(annotations.slice(annotations.length / 2, annotations.length));

    expect(
      annotations[0].traceId.spanId
    ).not.to.equal(annotations[annotations.length / 2].traceId.spanId);

    annotations.forEach(ann => {
      expect(ann.traceId.parentId).to.equal(firstAnn.traceId.traceId);
      expect(ann.traceId.spanId).not.to.equal(firstAnn.traceId.traceId);
      expect(ann.traceId.traceId).to.equal(firstAnn.traceId.traceId);
    });

    done();

  })
})

