const PluginBtp = require('ilp-plugin-btp')
const Ripple = require('./ripple')

// The code in this module is non-ripple specific. All you should have to do is
// change this._ripple to your network of choice. To integrate a new network,
// rewrite ./ripple.js for your new network.

class PluginXrpPaymentClient extends PluginBtp {
  constructor (opts) {
    super(opts)
    this._ripple = new Ripple(opts)
    this._connected = false
  }

  async _connect () {
    if (this._connected) return
    this._connected = true

    await this._ripple.connect()
    this._ripple.on('money', value => {
      if (this._handleMoney) {
        this._handleMoney(String(value))
          .catch(e => console.error('_handleMoney Error:', e))
      }
    })
  }

  async _getPaymentDetails () {
    const protocolData = this.ilpAndCustomToProtocolData({
      custom: {
        'get_payment_details': {}
      }
    })

    const response = await this._call(null, {
      type: BtpPacket.TYPE_MESSAGE,
      requestId: await this._requestId(),
      data: { protocolData }
    }

    const { protocolMap } = this.protocolDataToIlpAndCustom(response)
    const details = protocolMap['get_payment_details']

    if (!details) {
      throw new Error('could not fetch payment details')
    }

    return details
  }

  async _handleData (from, {requestId, data}) {
    const { ilp, protocolMap } = this.protocolDataToIlpAndCustom(data)

    if (protocolMap['get_payment_details']) {
      return this.ilpAndCustomToProtocolData({
        custom: {
          'get_payment_details': await this._ripple.getPaymentDetails()
        }
      })
    }

    if (!this._dataHandler) {
      throw new Error('no request handler registered')
    }

    const response = await this._dataHandler(ilp)
    return ilpAndCustomToProtocolData({ ilp: response })
  }

  async sendMoney (amount) {
    const details = await this._getPaymentDetails()
    this._ripple.sendMoney(details, amount)
  }
}
