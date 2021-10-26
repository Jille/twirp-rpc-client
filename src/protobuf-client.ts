import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { twirpErrorFromResponse } from './errors';
import { Observable, firstValueFrom } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';

export * from './errors';

export interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
  clientStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Promise<Uint8Array>;
  serverStreamingRequest(service: string, method: string, data: Uint8Array): Observable<Uint8Array>;
  bidirectionalStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Observable<Uint8Array>;
}

export interface TwirpClientProps {
  url: string; // base url of the twirp service
  headers?: object; // additional headers to add to the request e.g. { "x-custom-header": "header-value" }
  websocketsUrlRewriter: (url: string) => string;
  timeout?: number; // timeout in milliseconds
  // basic auth helper
  auth?: {
    username: string;
    password: string;
  };
}

class TwirpProtobufClient {
  private axiosClient: AxiosInstance;
  private url: string;
  private websocketsUrlRewriter: (url: string) => string;

  constructor({ url, headers, websocketsUrlRewriter, ...config }: TwirpClientProps) {
    this.url = url;
    this.websocketsUrlRewriter = websocketsUrlRewriter ?? ((url) => url);
    this.axiosClient = axios.create({
      ...config,
      baseURL: url,
      headers: {
        ...headers,
        accept: 'application/protobuf,application/json',
        'content-type': 'application/protobuf',
      },
      responseType: 'arraybuffer',
    });
  }

  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array> {
    return this.axiosClient
      .post(`/${service}/${method}`, data)
      .then((response: AxiosResponse<Buffer>) => {
        try {
          Buffer;
        } catch (e) {
          return new Uint8Array(response.data);
        }
        return Buffer.from(response.data);
      })
      .catch((error: AxiosError) => {
        if (error.response != undefined) {
          throw twirpErrorFromResponse(error.response);
        } else {
          throw error;
        }
      });
  }

  private websocket(service: string, method: string): WebSocketSubject {
    const url = this.url.replace(/^http/, 'ws') + `/${service}/${method}`;
    const wsSubject = webSocket({
      url: this.websocketsUrlRewriter(url),
      serializer: (msg) => msg,
      binaryType: 'arraybuffer',
      deserializer: (msg) => new Uint8Array(msg.data as ArrayBuffer),
    });
    wsSubject.subscribe(); // Enforce at least one subscriber, which causes it to open the connection.
    return wsSubject;
  }

  private serializeBinary(msg: Uint8Array): ArrayBuffer {
    const offset = msg.byteOffset;
    const length = msg.byteLength;
    return msg.buffer.slice(offset, offset + length);
  }

  private forwardInputData(data: Observable<Uint8Array>, ws: WebSocketSubject) {
    data.subscribe(
      (msg) => wsSubject.next(this.serializeBinary(msg)),
      (err) => wsSubject.error({ code: 4001, reason: 'Input stream broken' }),
      () => wsSubject.next('closeSend')
    );
  }

  clientStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Promise<Uint8Array> {
    const wsSubject = this.websocket(service, method);
    this.forwardInputData(data, wsSubject);
    return firstValueFrom(wsSubject.subscribe());
  }

  bidirectionalStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Observable<Uint8Array> {
    const wsSubject = this.websocket(service, method);
    this.forwardInputData(data, wsSubject);
    return wsSubject;
  }

  serverStreamingRequest(service: string, method: string, data: Uint8Array): Observable<Uint8Array> {
    const wsSubject = this.websocket(service, method);
    wsSubject.next(this.serializeBinary(data));
    return wsSubject;
  }
}

export function twirpProtobufClient(config: TwirpClientProps): Rpc {
  return new TwirpProtobufClient(config);
}

export default twirpProtobufClient;
