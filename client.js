const PluginBtp = require('ilp-plugin-btp')
const Ripple = require('./ripple')

class PluginXrpPaymentClient extends PluginBtp {
  constructor (opts) {
    super(opts)
    this._ripple = new Ripple(opts)
    this._connected = false
  }

  // This function is ripple specific. Replace it with any code necessary to connect to your
  // network. If your network is not connection oriented you can delete this function.
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

  // Make a call to the other side to request details on how to pay them. This
  // function is non-ripple specific, so it can stay the same if you integrate
  // a different network.
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

  // Override handleData to respond to "get_payment_details" requests. This
  // function is non-ripple specific, so it can stay the same if you integrate
  // a different network.
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

  // This function fetches payment details and then uses them to make a payment. You'll
  // need to override this code for your network in order to send a payment. The amount
  // here is in XRP drops, but you can make it whatever unit you like so long as it's
  // consistent
  async sendMoney (amount) {
    const details = await this._getPaymentDetails()
    this._ripple.sendMoney(details, amount)
  }
}
