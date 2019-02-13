import {Logger, model} from 'zipkin';

declare class RabbitmqLogger implements Logger {
  constructor(options: { [name: string]: any }, log: Console);
  logSpan(span: model.Span, config: { [name: string]: any }): void;
}

export {RabbitmqLogger};
