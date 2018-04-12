# ILP Plugin XRP Payment

- [Overview](#overview)
- [Configuration](#configuration)
  - [Client/Peer](#client-peer)
  - [Server](#server)
- [Integrating Other Systems](#integrating-other-systems)

## Overview

ILP Plugin XRP Payment is a plugin that uses XRP payments for settlement. Our
other XRP integrations use payment channels, which are higher performance but
require more money to be locked up.

This repository is intended to be a reference for developers who want to
integrate other systems.

## Configuration

- If you want anybody to be able to connect to you without updating your
  configuration, run the [Server](#server) plugin.

- If you're peering 1:1 or are connecting to someone running a server plugin,
  use the [Client/Peer](#client-peer) plugin.

### Client/Peer

```js
const PluginXrpPayment = require('ilp-plugin-xrp-payment')
const plugin = new PluginXrpPayment({
  role: 'client',
  server: 'btp+ws://example.com:1234',
  secret: 's...'
})
```

### Server

```js
const PluginXrpPayment = require('ilp-plugin-xrp-payment')
const plugin = new PluginXrpPayment({
  role: 'server',
  port: 1234,
  secret: 's...'
})
```

## Integrating Other Systems

TODO
