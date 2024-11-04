const EventEmitter = require('events')
const BusHelper = require('./BusHelper')
const GattServer = require('./GattServer')
const parseDict = require('./parseDict')

/**
 * @classdesc Device class interacts with a remote device.
 * @class Device
 * @extends EventEmitter
 * @see You can construct a Device object via {@link Adapter#getDevice} method
 */
class Device extends EventEmitter {
  constructor (dbus, adapter, device) {
    super()
    this.dbus = dbus
    this.adapter = adapter
    this.device = device
    this.helper = new BusHelper(dbus, 'org.bluez', `/org/bluez/${adapter}/${device}`, 'org.bluez.Device1', { usePropsEvents: true })
  }

  /**
   * The Bluetooth remote name.
   * @returns {string}
   */
  async getName () {
    return this.helper.prop('Name').catch(() => {
        console.warn(`[WARN] Could not find prop 'Name' for device ${this.getAddress()}`)
        return;
    }) ?? ''
  }

  /**
   * The Bluetooth device address of the remote device.
   * @returns {string}
   */
  async getAddress () {
    return this.helper.prop('Address').catch(() => {
        console.warn(`[WARN] Could not find prop 'Address' for device`)
        return;
    }) ?? ''
  }

  /**
   * The Bluetooth device Address Type (public, random).
   * @returns {string}
   */
  async getAddressType () {
    return this.helper.prop('AddressType').catch(() => {
        console.warn(`[WARN] Could not find prop 'AddressType' for device ${this.getAddress()}`)
        return;
    }) ?? ''
  }

  /**
   * The name alias for the remote device.
   * @returns {string}
   */
  async getAlias () {
    return await this.helper.prop('Alias').catch(() => {
        console.warn(`[WARN] Could not find prop 'Alias' for device ${this.getAddress()}`)
        return;
    }) ?? ''
  }

  /**
   * Received Signal Strength Indicator of the remote device
   * @returns {number}
   */
  async getRSSI () {
    return await this.helper.prop('RSSI').catch(() => {
        console.warn(`[WARN] Could not find prop 'RSSI' for device ${this.getAddress()}`)
        return;
    }) ?? 0
  }

  /**
   * Advertised transmitted power level.
   * @returns {number}
   */
  async getTXPower () {
    return await this.helper.prop('TxPower').catch(() => {
        console.warn(`[WARN] Could not find prop 'TxPower' for device ${this.getAddress()}`)
        return;
    }) ?? 0
  }

  /**
   * Advertised transmitted manufacturer data.
   * @returns {Object.<string, any>}
   */
  async getManufacturerData () {
    return parseDict(await this.helper.prop('ManufacturerData').catch(() => {
        console.warn(`[WARN] Could not find prop 'ManufacturerData' for device ${this.getAddress()}`)
        return;
    }) ?? {})
  }

  /**
   * Advertised transmitted data. (experimental: this feature might not be fully supported by bluez)
   * @returns {Object.<string, any>}
   */
  async getAdvertisingData () {
    return parseDict(await this.helper.prop('AdvertisingData').catch(() => {
        console.warn(`[WARN] Could not find prop 'AdvertisingData' for device ${this.getAddress()}`)
        return;
    }) ?? {})
  }


  /**
   * Advertised UUIDs
   * @returns {string[]}
   */
  async getUUIDs() {
    return await this.helper.prop('UUIDs').catch(() => {
        console.warn(`[WARN] Could not find prop 'UUIDs' for device ${this.getAddress()}`)
        return [];
    }) ?? []
  }

  /**
   * Advertised transmitted data.
   * @returns {Object.<string, any>}
   */
  async getServiceData () {
    return parseDict(await this.helper.prop('ServiceData').catch(() => {
        console.warn(`[WARN] Could not find prop 'ServiceData' for device ${this.getAddress()}`)
        return;
    }) ?? {})
  }

  /**
   * Indicates if the remote device is paired.
   * @returns {boolean}
   */
  async isPaired () {
    return await this.helper.prop('Paired').catch(() => {
        console.warn(`[WARN] Could not find prop 'Paired' for device ${this.getAddress()}`)
        return false;
    })
  }

  /**
   * Indicates if the remote device is currently connected.
   * @returns {boolean}
   */
  async isConnected () {
    return await this.helper.prop('Connected').catch(() => {
        console.warn(`[WARN] Could not find prop 'Connected' for device ${this.getAddress()}`)
        return false;
    })
  }

  /**
   * This method will connect to the remote device
   */
  async pair () {
    return await this.helper.callMethod('Pair').catch(() => {
        console.warn(`[WARN] Could not call method 'Pair' for device ${this.getAddress()}`)
        return;
    }) ?? false
  }

  /**
   * This method can be used to cancel a pairing operation initiated by the Pair method.
   */
  async cancelPair () {
    return await this.helper.callMethod('CancelPair').catch(() => {
        console.warn(`[WARN] Could not call method 'CancelPair' for device ${this.getAddress()}`)
        return;
    }) ?? false
  }

  /**
   * Connect to remote device
   */
  async connect () {
    const cb = (propertiesChanged) => {
      if ('Connected' in propertiesChanged) {
        const { value } = propertiesChanged.Connected
        if (value) {
          this.emit('connect', { connected: true })
        } else {
          this.emit('disconnect', { connected: false })
        }
      }
    }

    this.helper.on('PropertiesChanged', cb)
    await this.helper.callMethod('Connect')
  }

  /**
   * Disconnect remote device
   */
  async disconnect () {
    await this.helper.callMethod('Disconnect').catch(() => {
        console.warn(`[WARN] Could not call method 'Disconnect' for device ${this.getAddress()}`)
        return;
    }) ?? false
    this.helper.removeListeners()
  }

  /**
   * Init a GattServer instance and return it
   * @returns {GattServer}
   */
  async gatt () {
    const gattServer = new GattServer(this.dbus, this.adapter, this.device)
    await gattServer.init()
    return gattServer
  }

  /**
   * Human readable class identifier.
   * @returns {string}
   */
  async toString () {
    const name = this.getName()
    const address = this.getAddress()

    return `${name} [${address}]`
  }
}

/**
   * Connection event
   *
   * @event Device#connect
   * @type {object}
   * @property {boolean} connected - Indicates current connection status.
  */

/**
   * Disconection event
   *
   * @event Device#disconnect
   * @type {object}
   * @property {boolean} connected - Indicates current connection status.
  */

module.exports = Device
