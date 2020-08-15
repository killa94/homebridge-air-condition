import {
    AccessoryConfig,
    AccessoryPlugin,
    API,
    CharacteristicEventTypes,
    CharacteristicGetCallback,
    CharacteristicSetCallback,
    CharacteristicValue,
    HAP,
    Logging,
    Service
} from "homebridge";
import { default as axios } from 'axios';

axios.defaults.validateStatus = () => true;

module.exports = (api: API) => {
    api.registerAccessory('AirCondition', AirConditionPlugin);
}

class AirConditionPlugin {
    private readonly log: Logging;
    private readonly config: AccessoryConfig;
    private readonly api: API;

    private readonly switchService: Service;
    private readonly informationService: Service;
    private readonly thermostatService: Service;

    /**
     * REQUIRED - This is the entry point to your plugin
     */
    constructor(log: Logging, config: AccessoryConfig, api: API) {
        this.log = log;
        this.config = config;
        this.api = api;

        this.log.debug('Air Condition Plugin Loaded');

        // your accessory must have an AccessoryInformation service
        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Custom Manufacturer")
            .setCharacteristic(this.api.hap.Characteristic.Model, "Custom Model");

        // create a new "Switch" service
        this.switchService = new this.api.hap.Service.Switch('AirCondition');

        // create a new "Thermostat" service
        this.thermostatService = new this.api.hap.Service.Thermostat('AirCondition');

        // link methods used when getting or setting the state of the service 
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .on('get', this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .on('set', this.setOnHandler.bind(this));  // bind to setOnHandler method below

        // link methods used when getting or setting the state of the service 
        //this.switchService.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
        //    .on('get', this.getOnHandler.bind(this))   // bind to getOnHandler method below
        //    .on('set', this.setOnHandler.bind(this));  // bind to setOnHandler method below

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState)
            .on('get', this.handleCurrentHeatingCoolingStateGet.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
            .on('get', this.handleTargetHeatingCoolingStateGet.bind(this))
            .on('set', this.handleTargetHeatingCoolingStateSet.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
            .on('get', this.handleCurrentTemperatureGet.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.TargetTemperature)
            .on('get', this.handleTargetTemperatureGet.bind(this))
            .on('set', this.handleTargetTemperatureSet.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.TemperatureDisplayUnits)
            .on('get', this.handleTemperatureDisplayUnitsGet.bind(this))
            .on('set', this.handleTemperatureDisplayUnitsSet.bind(this));
    }

    /**
     * REQUIRED - This must return an array of the services you want to expose.
     * This method must be named "getServices".
     */
    getServices() {
        return [
            this.informationService,
            this.switchService,
            this.thermostatService,
        ];
    }

    async getOnHandler(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/state');
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting current state', response.data.state);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.state);
    }

    async setOnHandler(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        this.log.info('Setting air condition state to:', value);
        if (value) {
            await this.turnOn();
        } else {
            await this.turnOff();
        }
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }

    async turnOn(): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/turn-on');
    }

    async turnOff(): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/turn-off');
    }

    /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
    async handleCurrentHeatingCoolingStateGet(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/mode');
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting current mode', response.data.mode);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.mode);
    }


    /**
     * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
     */
    async handleTargetHeatingCoolingStateGet(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/mode');
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting mode', response.data.mode);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.mode);
    }

    /**
     * Handle requests to set the "Target Heating Cooling State" characteristic
     */
    async handleTargetHeatingCoolingStateSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        this.log.info('Setting mode to:', value);

        const response = await axios.post('http://192.168.0.29:8083/air-condition/mode', { mode: value });
        if (response.status === 400 && response.data.errorCode === 'alreadyInTargetMode') {
            return callback(null);
        } else if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, 1);
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Current Temperature" characteristic
     */
    async handleCurrentTemperatureGet(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/temperature');
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting current temperature', response.data.temperature);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.temperature);
    }


    /**
     * Handle requests to get the current value of the "Target Temperature" characteristic
     */
    async handleTargetTemperatureGet(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get('http://192.168.0.29:8083/air-condition/temperature');
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting temperature', response.data.temperature);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.temperature);
    }

    /**
     * Handle requests to set the "Target Temperature" characteristic
     */
    async handleTargetTemperatureSet(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        this.log.info('Setting temperature to:', value);

        const response = await axios.post('http://192.168.0.29:8083/air-condition/temperature', { temperature: value });
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, 1);
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }

    /**
     * Handle requests to get the current value of the "Temperature Display Units" characteristic
     */
    handleTemperatureDisplayUnitsGet(callback: CharacteristicGetCallback) {
        this.log.debug('Triggered GET TemperatureDisplayUnits');

        // set this to a valid value for TemperatureDisplayUnits
        const currentValue = 1;

        callback(null, currentValue);
    }

    /**
     * Handle requests to set the "Temperature Display Units" characteristic
     */
    handleTemperatureDisplayUnitsSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.log.debug('Triggered SET TemperatureDisplayUnits:', value);

        callback(null);
    }
}
