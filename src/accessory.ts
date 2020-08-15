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
        this.switchService = new this.api.hap.Service.Switch('Accssory Switch');

        // create a new "Thermostat" service
        this.thermostatService = new this.api.hap.Service.Thermostat('Thermostat');

        // link methods used when getting or setting the state of the service 
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .on('get', this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .on('set', this.setOnHandler.bind(this));  // bind to setOnHandler method below

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.CurrentHeatingCoolingState)
            .on('get', this.getHeatingCoolingStat.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.TargetHeatingCoolingState)
            .on('get', this.getHeatingCoolingStat.bind(this))
            .on('set', this.setHeatingCoolingState.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
            .on('get', this.getTemperature.bind(this));

        this.thermostatService.getCharacteristic(this.api.hap.Characteristic.TargetTemperature)
            .on('get', this.getTemperature.bind(this))
            .on('set', this.setTemperature.bind(this));
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
        const response = await axios.get(`${this.config.serviceUrl}/air-condition/state`);
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
            await axios.get(`${this.config.serviceUrl}/air-condition/turn-on`);
        } else {
            await axios.get(`${this.config.serviceUrl}/air-condition/turn-off`);
        }
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }

    async getHeatingCoolingStat(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get(`${this.config.serviceUrl}/air-condition/mode`);
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting mode', response.data.mode);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.mode);
    }

    async setHeatingCoolingState(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        this.log.info('Setting mode to:', value);

        const response = await axios.post(`${this.config.serviceUrl}/air-condition/mode`, { mode: value });
        if (response.status === 400 && response.data.errorCode === 'alreadyInTargetMode') {
            return callback(null);
        } else if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, 1);
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }

    async getTemperature(callback: CharacteristicGetCallback): Promise<void> {
        const response = await axios.get(`${this.config.serviceUrl}/air-condition/temperature`);
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.log.info('Getting temperature', response.data.temperature);
        // the first argument of the callback should be null if there are no errors
        // the second argument contains the current status of the device to return.
        callback(null, response.data.temperature);
    }

    async setTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        this.log.info('Setting temperature to:', value);

        const response = await axios.post(`${this.config.serviceUrl}/air-condition/temperature`, { temperature: value });
        if (response.status !== 200) {
            return callback(new Error(response.data));
        }

        this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, 1);
        // the first argument of the callback should be null if there are no errors
        callback(null);
    }
}
