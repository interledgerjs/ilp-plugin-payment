const PluginBtp = require('ilp-plugin-btp')
const Ripple = require('./ripple')

class PluginXrpPaymentClient extends PluginBtp {
  constructor (opts) {
    super(opts)
    this._connected = false
  }

  setSettler (settler) {
    this._settler = settler
  }

  async _connect () {
    if (this._connected) return
    this._connected = true

    await this._settler.connect()
    this._settler.on('money', (userId, value) => {
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
    })

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
          'get_payment_details': await this._settler.getPaymentDetails(0)
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
    this._settler.sendMoney(details, amount)
  }
}
