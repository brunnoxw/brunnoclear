const readlineSync = require('readline-sync');

/**
 * Aguarda o usuário pressionar Enter
 * @returns {Promise<void>}
 */
function aguardarEnter() {
	readlineSync.keyInPause('', { guide: false });
	return Promise.resolve();
}

/**
 * Alias para aguardarEnter
 * @returns {Promise<void>}
 */
function esperarEnter() {
	return aguardarEnter();
}

module.exports = {
	aguardarEnter,
	esperarEnter
};
