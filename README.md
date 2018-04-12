# ILP Plugin Payment

- [Overview](#overview)
- [Configuration](#configuration)
  - [Client/Peer](#client-peer)
  - [Server](#server)
- [Integrating Other Systems](#integrating-other-systems)

## Overview

ILP Plugin Payment is a base class that can be extended to integrate different
payment systems. These integrations are assumed to be payment-based, in that
one side sends a payment to the other side and then the other side detects the
incoming settlement.

## Configuration

- If you want anybody to be able to connect to you without updating your
  configuration, run the [Server](#server) plugin. Pass `"role": "server"` into
  the plugin opts.

- If you're peering 1:1 or are connecting to someone running a server plugin,
  use the [Client/Peer](#client-peer) plugin. Pass `"role": "client"` or no `"role"`
  field into the plugin opts.

The examples below will not work with the base class, but will work with the
derived classes.

### Client/Peer

```js
const PluginPayment = require('ilp-plugin-payment')

const plugin = new PluginPayment({
  role: 'client',
  server: 'btp+ws://example.com:1234',
  secret: 's...'
})
```

### Server

```js
const PluginPayment = require('ilp-plugin-payment')
const plugin = new PluginPayment({
  role: 'server',
  port: 1234,
  secret: 's...'
})
```

## Integrating Other Systems

TODO
