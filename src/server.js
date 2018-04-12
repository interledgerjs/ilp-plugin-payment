const PluginMiniAccounts = require('ilp-plugin-mini-accounts')
const IlpPacket = require('ilp-packet')
const debug = require('debug')('ilp-plugin-xrp-payment-server')

class PluginPaymentServer extends PluginMiniAccounts {
  constructor (opts) {
    super(opts)
    this._connected = false

    this._settleTo = new BigNumber(opts.settleTo || '0')
    this._settleThreshold = opts.settleThreshold
    this._balances = new Map()
    this._settling = false
  }

  setSettler (settler) {
    this._settler = settler
  }

  async _preConnect () {
    if (this._connected) return
    this._connected = true

    await this._settler.connectPayment()
    this._settler.on('money', (userId, value) => {
      const balance = this._balances.get(userId) || new BigNumber(0)
      const newBalance = balance.minus(value)
      this._balances.set(userId, newBalance)
    })
  }

  async _getPaymentDetails (from) {
    const protocolData = this.ilpAndCustomToProtocolData({
      custom: {
        'get_payment_details': {}
      }
    })

    const response = await this._call(from, {
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

  _settle (from) {
    if (this._settling) return
    this._settling = true

    setImmediate(async () => {
      try {
        const account = this.ilpAddressToAccount(from)
        const details = await this._getPaymentDetails(from)
        const amount = this._settleTo.minus(this._balances.get(account)).toString()
        await this._settler.sendPayment(details, amount)

        const balance = this._balances.get(account)
        const newBalance = balance.add(amount)
        this._balances.set(account, newBalance)
      } catch (e) {
        debug('settlement error. error=', e)
      }

      // reset the settling flag no matter what
      this._settling = false
    })
  }

  async _handlePrepareResponse (destination, response, prepare) {
    const account = this.ilpAddressToAccount(destination)

    if (response.type === IlpPacket.TYPE_FULFILL) {
      const account = this.ilpAddressToAccount(destination)
      const balance = this._balances.get(account) || new BigNumber(0)
      const newBalance = balance.minus(prepare.data.amount)
      this._balances.set(account, newBalance)

      if (newBalance.isLessThan(this._settleThreshold)) {
        this._settle(destination)
      }
    }
  }

  async _handleCustomData (from, { requestId, data }) {
    const account = this.ilpAddressToAccount(from)
    const { ilp, protocolMap } = this.protocolDataToIlpAndCustom(data)

    if (protocolMap['get_payment_details']) {
      return this.ilpAndCustomToProtocolData({
        custom: {
          'get_payment_details': await this._settler.getPaymentDetails(account)
        }
      })
    }

    const packet = IlpPacket.deserializeIlpPacket(ilp)
    if (packet.type === IlpPacket.TYPE_PREPARE) {
      const balance = balances.get(account) || new BigNumber(0)
      const newBalance = balance.plus(packet.data.amount)
      if (balance.isGreaterThan(0)) {
        return this.ilpAndCustomToProtocolData({
          ilp: IlpPacket.serializeIlpReject({
            code: 'T04',
            triggeredBy: this._prefix.substring(0, this._prefix.length - 1),
            message: 'Insufficient client balance.'
          })
        })
      }
      balances.set(account, newBalance)
    }

    if (!this._dataHandler) {
      throw new Error('no request handler registered')
    }

    const response = await this._dataHandler(ilp)

    const responsePacket = IlpPacket.deserializeIlpPacket(ilp)
    if (responsePacket.type === IlpPacket.TYPE_REJECT) {
      const balance = balances.get(account) || new BigNumber(0)
      const newBalance = balance.minus(packet.data.amount)
      balances.set(account, newBalance)
    }

    return this.ilpAndCustomToProtocolData({ ilp: response })
  }
}

module.exports = PluginPaymentServer