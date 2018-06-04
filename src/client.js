const crypto = require('crypto')
const debug = require('debug')('ilp-plugin-payment:client')
const BtpPacket = require('btp-packet')
const PluginBtp = require('ilp-plugin-btp')

class PluginPaymentClient extends PluginBtp {
  constructor (opts) {
    super(opts)
    //TODO  check to make sure opts.listener isn't passed otherwise this tries to setup as a server plugin
    this._connected = false
  }

  setSettler (settler) {
    this._settler = settler
  }

  async _connect () {
    if (this._connected) return
    this._connected = true

    await this._settler.connectPayment()
    this._settler.on('money', (userId, value) => {
      // throw error if no money handler registered - as per LPI2 spec
      // but doesn't return the money
      debug(`received money event, userId:${userId}, value: ${value}`)
      this._moneyHandler(String(value))
        .catch(e => console.error('_moneyHandler Error:', e))
      }
    )
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
    const details = protocolMap['custom']['get_payment_details']

    if (!details) {
      throw new Error('could not fetch payment details')
    }

    return details
  }

  async _handleData (from, {requestId, data}) {
    const { ilp, protocolMap } = this.protocolDataToIlpAndCustom(data)

    if (protocolMap['custom'] && protocolMap['custom']['get_payment_details']) {
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
    return this.ilpAndCustomToProtocolData({ ilp: response })
  }

  async sendMoney (amount) {
    const details = await this._getPaymentDetails()
    await this._settler.sendPayment(details, amount)
  }
  
  async _requestId () {
    //TODO move this method to the base plugin, PluginBtp
    return crypto.randomBytes(4).readUInt32BE()
  }
}

module.exports = PluginPaymentClient
