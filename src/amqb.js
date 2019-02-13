const amqp = require('amqplib');
const EventEmitter = require('events');

let connectCounter = 1;

/* use closure share connection(闭包:共享连接) */
const connect = (config) => {
  var [conn, channel] = [null, null];

  return async function() {
    console.log('Connect Counter:', connectCounter++);
    conn = await amqp.connect(config);
    channel = await conn.createChannel();

    return {conn, channel}
  }
}

class Queue {
  constructor(config) {
    this.config = config;
    this.conn = null;
    this.channel = null;
    this.isConnect = false;
    this.consumeEmitter = new EventEmitter();
  }

  async connect() {
    const ctx = await (connect(this.config))();
    this.conn = ctx.conn;
    this.channel = ctx.channel;
    this.isConnect = true;
  }

  async reconnect(reason) {
    console.log(`mq connect ${reason} , reconnect ${new Date()}`)
    await (connect(this.config))();
    return this.consumeEmitter.emit('consume');
  }

  onError() {
    this.conn.on('error', (err) => {
      this.isConnect = false
      setTimeout(async () => {
        await this.reconnect('error')
      }, 1000);
    });
  }

  onClose() {
    this.conn.on('close', (err) => {
      this.isConnect = false
      setTimeout(async () => {
        await this.reconnect('close');
      }, 1000);
    })
  }

  async init() {
    if (!this.isConnect) {
      await this.connect();
    }

    const connEventNames = this.conn.eventNames();

    if(connEventNames.indexOf('error') === -1) {
      this.onError();
    }

    if(connEventNames.indexOf('close') === -1) {
      this.onClose();
    }

  }

  /**
   * close connection
   */
  async destroy() {
    this.isConnect = false;
    return await this.conn.close();
  }

  /**
   * connect exchange
   */
  async getExchange(exchangeName, type = 'direct', options = {durable: true}) {
    return await this.channel.assertExchange(exchangeName, type, options);
  }

  /**
   * connect queue
   */
  async getQueue(queueName, options = {exclusive: false}) {
    return await this.channel.assertQueue(queueName, options);
  }

  /**
   * bind handle
   */
  async bindHandle(operation, exName, quName, routingKey, options) {
    await this.init();

    const ex = await this.getExchange(exName, 'direct', options);
    const qu = await this.getQueue(quName, options);

    switch (operation) {
      case 'bind':
        return await this.channel.bindQueue(qu.queue, ex.exchange, routingKey); 
      case 'unbind':
        return await this.channel.unbindQueue(qu.queue, ex.exchange, routingKey);       
      default:
        return null;  
    }
  }

  /**
   * consume msg and add lisentner
   */
  async onConsume(ags) {
    const consumeEventNames = this.consumeEmitter.eventNames();

    if(consumeEventNames.indexOf('consume') > -1) {
      return;
    }

    this.consumeEmitter.on('consume', async () => {
      return await this.channel.consume(ags[0], async (msg) => { 
        await ags[1](msg.content.toString(), ags[0]);
        if(ags[2] && !ags[2].noAck) {
          await this.channel.ack(msg);
        }
      }, ags[2]);
    })

    return this.consumeEmitter.emit('consume');
  }

  async msgHandle(operation, ...ags) {
    try {
      await this.init();

      switch (operation) {
        case 'produce':
          return await this.channel.publish(...ags);
        case 'consume':
          return await this.onConsume(ags);
        default:
          return console.log('choose operation?');
      }
    } catch (error) {
      return console.log('handle error', error);
    }
  }

  async bindQueue(exName, quName, routingKey, options) {
    return await this.bindHandle('bind', exName, quName, routingKey, options);
  }

  async unbindQueue(exName, quName, routingKey, options) {
    return await this.bindHandle('unbind', exName, quName, routingKey, options);
  }

  async produce(exName, routingKey, msg) {
    return await this.msgHandle('produce', exName, routingKey, msg);
  }

  async consume(quName, cb, options = {noAck: true}) {
    return await this.msgHandle('consume', quName, cb, options);
  }

}

module.exports = config => new Queue(config);
