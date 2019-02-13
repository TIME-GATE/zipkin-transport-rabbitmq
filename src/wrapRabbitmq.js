/* wrap consume & produce only */
const {Annotation, InetAddress} = require('zipkin');

module.exports = function zipkinClient(
  tracer,
  Rabbitmq,
  options,
  serviceName = tracer.localEndpoint.serviceName,
  remoteServiceName = 'rabbitmq'
) {
  const sa = {
    serviceName: remoteServiceName,
    host: new InetAddress(options.host),
    port: options.port
  };
  function mkZipkinCallback(callback, id) {
    const originalId = tracer.id;
    return function zipkinCallback(...args) {
      tracer.letId(id, () => {
        tracer.recordAnnotation(new Annotation.ClientRecv());
      });
      // callback runs after the client request, so let's restore the former ID
      tracer.letId(originalId, () => {
        callback.apply(this, args);
      });
    };
  }
  function commonAnnotations(rpc) {
    tracer.recordRpc(rpc);
    tracer.recordAnnotation(new Annotation.ServiceName(serviceName));
    tracer.recordAnnotation(new Annotation.ServerAddr(sa));
    tracer.recordAnnotation(new Annotation.ClientSend());
  }

  const rabbitmqClient = Rabbitmq(options);
  const methodsToWrap = ['consume', 'produce'];
  
  const wrap = function(client, traceId) {
    const clientNeedsToBeModified = client;
    
    methodsToWrap.forEach((method) => {

      const actualFn = clientNeedsToBeModified[method];

      clientNeedsToBeModified[method] = function(...args) {
        const callback = method === 'consume' 
          ? args[1] 
          : () => { console.log('do nothing') };

        const id = traceId || tracer.createChildId();
        tracer.letId(id, () => {
          commonAnnotations(method);
        });

        const wrapper = mkZipkinCallback(callback, id);
        const newArgs = [...args, wrapper];

        actualFn.apply(this, newArgs);
      };
    });
  };

  wrap(rabbitmqClient);
  return rabbitmqClient;
}