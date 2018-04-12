# ILP Plugin Payment

- [Overview](#overview)
- [Configuration](#configuration)
  - [Client/Peer](#client-peer)
  - [Server](#server)
- [Integrating Other Systems](#integrating-other-systems)
  - [connectPayment](#connectpayment)
  - [getPaymentDetails](#getpaymentdetails)
  - [sendPayment](#sendpayment)
  - [Event: Money](#event-money)

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
  /* ... */
})
```

### Server

```js
const PluginPayment = require('ilp-plugin-payment')
const plugin = new PluginPayment({
  role: 'server',
  port: 1234,
  /* ... */
})
```

## Integrating Other Systems

The following methods and events must be implemented in order to integrate a
new payment system via this plugin.

For a blank starter, you can copy the snippet below. If you want to work off of
an XRP ledger integration, use [the XRP example
code](./examples/ilp-plugin-xrp-payment.js).

```js
class MyPaymentPlugin extends PluginPayment {
  constructor (opts) {
    super(opts)
  }

  // You must also have a method in here somewhere which calls
  // this.emit('money', userId, amount) on incoming payments.

  async connectPayment () {
  }

  async sendPayment (details, amount) {
  }

  async getPaymentDetails (userId) {
  }
}
```

### connectPayment

`async connectPayment () -> Promise<void>`

Connect to the settlement network. For example, [on XRP](./examples/ilp-plugin-xrp-payment.js):

```js
async connect () {
  await this._api.connect()
  await this._api.connection.request({
    command: 'subscribe',
    accounts: [ this._address ]
  })

  // This is how we detect an incoming transaction. You'll need some equivalent of this
  // that calls this._handleMoney whenever a payment destined for this plugin comes in.
  this._api.connection.on('transaction', ev => {
    if (ev.validated && ev.transaction &&
      ev.transaction.TransactionType === 'Payment' &&
      ev.transaction.Destination === this._address &&
      ev.transaction.Amount.currency === 'XRP') {
      const userId = this._destinationTagToUserId(ev.transaction.DestinationTag)
      const value = new BigNumber(ev.transaction.Amount.value).times(1e6).toString()
      this.emitAsync('money', userId, value)
    }
  })
}
```

### getPaymentDetails

`async getPaymentDetails (userId: String) -> Promise<Object> `

Create payment details associated with a given `userId`. There may be any
number of different `userId`s, so the details given should be able to
differentiate incoming payments from each other.

In the `connectPayment` example [for
XRP](./examples/ilp-plugin-xrp-payment.js), for instance, the destinationTag is
used to look up the userId for an incoming payment.

The result of this function will be passed into the peer's `sendPayment`
function. On XRP, this function would be implemented like so:

```js
async getPaymentDetails (userId) {
  return {
    address: this._address,
    destinationTag: this._userIdToDestinationTag(userId)
  }
}
```


### sendPayment

`async sendPayment (details: Object, amount: String) -> Promise<Object>`

Before `sendPayment` is called, a `get_payment_details` RPC call is made. This
calls the `getPaymentDetails` function on the peer's plugin, and returns the
result. The result is passed into `sendPayment` as the `details` argument.

The amount is a a string-integer denominated in base ledger units. These base
ledger units can be anything you want (so long as they're used consistently),
but are typically the lowest divisible unit of the ledger.  For example, XRP
would use drops and Bitcoin would use Satoshis.

[On XRP](./examples/ilp-plugin-xrp-payment.js), the sendPayment function would
look like this:

```js
async sendMoney (details, amount) {
  const xrpAmount = new BigNumber(amount).div(1e6).toString()

  await this._txSubmitter('preparePayment', {
    source: {
      address: this._address,
      maxAmount: {
        value: xrpAmount,
        currency: 'XRP'
      }
    },
    destination: {
      address: details.address,
      tag: details.destinationTag,
      amount: {
        value: xrpAmount,
        currency: 'XRP'
      }
    }
  })
}
```

### Event: Money

`event 'money' (userId: String, amount: String)`

This event is emitted when incoming funds are detected.

If the details resulting from `getPaymentDetails(userId)` are passed (as
`details`) into your peer's `sendPayment(details, amount)`, then you MUST
be able to detect the incoming payment and emit it as `userId, amount`.

You can see how this is implemented [in the example XRP
plugin](./examples/ilp-plugin-xrp-payment.js):

```js
this._api.connection.on('transaction', ev => {
  if (ev.validated && ev.transaction &&
    ev.transaction.TransactionType === 'Payment' &&
    ev.transaction.Destination === this._address &&
    ev.transaction.Amount.currency === 'XRP') {
    const userId = this._destinationTagToUserId(ev.transaction.DestinationTag)
    const value = new BigNumber(ev.transaction.Amount.value).times(1e6).toString()
    this.emitAsync('money', userId, value)
  }
})
```
