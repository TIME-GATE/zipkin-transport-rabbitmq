const {Annotation, InetAddress} = require('zipkin');

module.exports = function zipkinClient(
  tracer,
  Rabbitmq,
  serviceName = tracer.localEndpoint.serviceName,
  remoteServiceName = 'rabbitmq'
) {
  function annotateSuccess(id) {
    tracer.letId(id, () => {
      tracer.recordAnnotation(new Annotation.ClientRecv());
    });
  }

  function annotateError(id, error) {
    tracer.letId(id, () => {
      tracer.recordBinary('error', error.toString());
      tracer.recordAnnotation(new Annotation.ClientRecv());
    });
  }

  function mkZipkinCallback(callback, id) {
    return function zipkinCallback(...args) {
      if (args[0]) {
        annotateError(id, args[0]);
      } else {
        annotateSuccess(id);
      }
      callback.apply(this, args);
    };
  }

  class ZipkinRabbitmq extends Rabbitmq {}

  const actualFn = ZipkinRabbitmq.prototype.consume;

  ZipkinRabbitmq.prototype.consume = function(quName, cb, options = {noAck: true}) {
    const id = tracer.createChildId();
    tracer.letId(id, () => {
      tracer.recordAnnotation(new Annotation.ClientSend());
      tracer.recordAnnotation(new Annotation.ServiceName(serviceName));
      tracer.recordAnnotation(new Annotation.ServerAddr({
        serviceName: remoteServiceName,
        host: new InetAddress(this.host),
        port: this.port
      }));
      tracer.recordRpc(`query ${this.database}`);
    });

    const consume = actualFn.call(this, quName, mkZipkinCallback(cb, id), options);

    return consume;
  }

  return ZipkinRabbitmq;
}