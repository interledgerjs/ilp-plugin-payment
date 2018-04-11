// Ripple specific modules
const { RippleAPI } = require('ripple-lib')
const { deriveAddress, deriveKeypair } = require('ripple-keypairs')
const { createSubmitter } = require('ilp-plugin-xrp-paychan-shared')
const BigNumber = require('bignumber.js')
const EventEmitter = require('eventemitter2')

class Ripple extends EventEmitter {
  constructor (opts) {
    super()

    if (!opts.secret) {
      throw new Error('opts.secret must be defined')
    }

    // Parameters to connect to the network.
    this._secret = opts.secret
    this._address = opts.address || deriveAddress(deriveKeypair(opts.secret).publicKey)
    this._xrpServer = opts.xrpServer || 'wss://s1.ripple.com'
    this._api = new RippleAPI({ server: this._xrpServer })
    this._txSubmitter = createSubmitter(this._api, this._address, this._secret)

    // This destination tag allows us to determine which payments are for us.
    // If we didn't have it, then a peer could send a payment to our address
    // and multiple plugins might register the incoming money. If you don't
    // have a mechanism to do this, then be very careful that multiple plugins
    // don't run on the same account
    this._destinationTag = crypto.randomBytes(4).readUInt32BE(0)
  }

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
        ev.transaction.DestinationTag === this._destinationTag &&
        ev.transaction.Destination === this._address &&
        ev.transaction.Amount.currency === 'XRP') {
        const value = new BigNumber(ev.transaction.Amount.value).times(1e6).toString()
        this.emitAsync('money', value)
      }
    })
  }

  // This function needs to be overloaded for different networks. Return whatever details
  // are needed in order to pay to this plugin's account. They'll be returned when the other
  // side calls _getPaymentDetails()
  async getPaymentDetails () {
    return {
      address: this._address,
      destinationTag: this._destinationTag
    }
  }

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
}
