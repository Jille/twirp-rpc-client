# Twirp Rpc Client

![Build](https://github.com/dtraft/twirp-rpc-client/workflows/Build/badge.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/dtraft/twirp-rpc-client/badge.svg?branch=master)](https://coveralls.io/github/dtraft/twirp-rpc-client?branch=master)

A simple typescript client for Twirp protobuf services based on Axios.  Designed for use with the service wrappers generated by [ts-proto](https://github.com/stephenh/ts-proto).

## Usage

Install using npm:

`npm install --save twirp-rpc-client`

Generate your service code using the (protobuf compiler)[https://github.com/protocolbuffers/protobuf] and [ts-proto](https://github.com/stephenh/ts-proto).

For example: `protoc --plugin=node_modules/ts-proto/protoc-gen-ts_proto example/service.proto -I./example --ts_proto_out=./example`

Then, import the `ClientImpl` generated by ts-proto and configure the `twirpProtobufClient` with the base url of your twirp service.

```typescript
import {HaberdasherClientImpl, Hat} from './generated/service'
import twirpProtobufClient from "../src";

const haberdasherClient = new HaberdasherClientImpl(twirpProtobufClient({
        url: "https://localhost:3000/twirp"
}))

haberdasherClient.MakeHat({inches: 12})
    .then((hat:Hat) => console.log(hat))
    .catch(error => console.log(error))
```

For more details, see the docs regarding [ts-proto service generation](https://github.com/stephenh/ts-proto#current-disclaimers).

### Configuration Options

```typescript
TwirpClientProps {
  url: string; // base url of the twirp service
  headers?: object; // additional headers to add to the request e.g. { "x-custom-header": "header-value" }
  timeout?: number; // timeout in milliseconds
  auth?: { // basic auth helper
    username: string;
    password: string;
  };
}
```
## Current Limitations
* Only supports protocol buffer serialization from twirp services.  This is because ts-proto currently only generates protobuf service client implementations.


