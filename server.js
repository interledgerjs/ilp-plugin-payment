const PluginMiniAccounts = require('ilp-plugin-mini-accounts')
const Ripple = require('./ripple')

class PluginXrpPaymentServer extends PluginBtp {
  constructor (opts) {
    super(opts)
    this._ripple = new Ripple(opts)
    this._connected = false

    this._balances = new Map()
  }

  async _preConnect () {
    if (this._connected) return
    this._connected = true

    await this._ripple.connect()
    this._ripple.on('money', (userId, value) => {
      const balance = this._balances.get(userId) || new BigNumber(0)
      const newBalance = balance.plus(value)
      this._balances.set(userId, newBalance)
    })
  }

  async _handlePrepareResponse (destination, response, prepare) {
    // TODO: balance stuff
  }

  async _sendPrepare 

  async _handleCustomData (from, { requestId, data }) {
    const { ilp, protocolMap } = this.protocolDataToIlpAndCustom(data)

    if (protocolMap['get_payment_details']) {
      return this.ilpAndCustomToProtocolData({
        custom: {
          'get_payment_details': await this._ripple.getPaymentDetails(from)
        }
      })
    }

    // TODO: balance stuff

    if (!this._dataHandler) {
      throw new Error('no request handler registered')
    }

    const response = await this._dataHandler(ilp)
    return ilpAndCustomToProtocolData({ ilp: response })
  }
}
