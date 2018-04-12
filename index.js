const EventEmitter = require('eventemitter2')
const PaymentServerPlugin = require('./src/server')
const PaymentClientPlugin = require('./src/client')

class PaymentPlugin extends EventEmitter {
  constructor (opts) {
    super()

    this._role = opts.role || 'client'
    const InternalPluginClass = role === 'client' ? PaymentClientPlugin : PaymentServerPlugin
    this._plugin = new InternalPluginClass(opts)

    this._plugin.setSettler(this)

    this._plugin.on('connect', () => this.emitAsync('connect'))
    this._plugin.on('disconnect', () => this.emitAsync('disconnect'))
    this._plugin.on('error', e => this.emitAsync('error', e))
  }

  async connect () {
    return this._plugin.connect()
  }

  async disconnect () {
    return this._plugin.disconnect()
  }

  isConnected () {
    return this._plugin.isConnected()
  }

  async sendData (data) {
    return this._plugin.sendData(data)
  }

  async sendMoney (amount) {
    return this._plugin.sendMoney(amount)
  }

  registerDataHandler (dataHandler) {
    return this._plugin.registerDataHandler(dataHandler)
  }

  deregisterDataHandler () {
    return this._plugin.deregisterDataHandler()
  }

  registerMoneyHandler (moneyHandler) {
    return this._plugin.registerMoneyHandler(moneyHandler)
  }

  deregisterMoneyHandler () {
    return this._plugin.deregisterMoneyHandler()
  }
}

PaymentPlugin.version = 2
module.exports = PaymentPlugin
