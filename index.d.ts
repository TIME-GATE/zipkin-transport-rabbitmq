import {Logger, model} from 'zipkin';

declare class RabbitmqLogger implements Logger {
  constructor(options: {
    rabbitmqHost: string,
    rabbitmqPort?: number,
    rabbitmqInterval?: number,
    log?: Console
  });
  logSpan(span: model.Span): void;
}
export {RabbitmqLogger};
