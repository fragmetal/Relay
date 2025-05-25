require('colors');

/**
 * @param {string[]} message 
 */
const info = (...message) => {
    const time = new Date().toLocaleTimeString();
    console.info(`[${time}]`.gray, '[Info]'.blue, message.join(' '));
}

/**
 * @param {string[]} message 
 */
const success = (...message) => {
    const time = new Date().toLocaleTimeString();
    console.info(`[${time}]`.gray, '[OK]'.green, message.join(' '));
}

/**
 * @param {string[]} message 
 */
const error = (...message) => {
    const time = new Date().toLocaleTimeString();
    console.error(`[${time}]`.gray, '[Error]'.red, message.join(' '));
}

/**
 * @param {string[]} message 
 */
const warn = (...message) => {
    const time = new Date().toLocaleTimeString();
    console.warn(`[${time}]`.gray, '[Warning]'.yellow, message.join(' '));
}

module.exports = { info, success, error, warn }