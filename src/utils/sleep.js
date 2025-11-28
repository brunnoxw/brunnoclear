/**
 * Pausa a execução por um período em segundos
 * @param {number} segundos - Quantidade de segundos para aguardar
 * @returns {Promise<void>}
 */
function sleep(segundos) {
	return new Promise((resolve) => setTimeout(resolve, segundos * 1000));
}

/**
 * Pausa a execução por milissegundos
 * @param {number} ms - Quantidade de milissegundos para aguardar
 * @returns {Promise<void>}
 */
function sleepMs(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
	sleep,
	sleepMs
};
