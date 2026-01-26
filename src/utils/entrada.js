
/**
 * Aguarda o usuário pressionar Enter
 * @returns {Promise<void>}
 */

async function aguardarEnter() {
    await require('./readline-async').readlineAsync.question('Pressione ENTER para continuar...');
    return;
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
