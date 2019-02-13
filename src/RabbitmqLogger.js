const amqp = require('./amqb');
const THRIFT = require('zipkin-encoder-thrift');

module.exports = class RabbitmqLogger {
  constructor(options, log = console) {
    this.client = amqp(options);
    this.log = log;

  }

  async logSpan(config, span) {

    /* if not bind queue */
    await amqp.bindQueue(
      config.exchangeName,
      config.queueName,
      config.routingKey
    );

    try {
      const encodedSpan = THRIFT.encode(span);

      await amqp.produce(
        config.exchangeName,
        config.routingKey,
        new Buffer(encodedSpan)
      );
    } catch (err) {
      this.log('Error writing Zipkin data to Rabbitmq', err);
    }
  }

  async close() {
    return this.close.destroy();
  }

}