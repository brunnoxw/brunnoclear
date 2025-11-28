const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirProgressoCompleto } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { listarServidores } = require('../services/discord');
const { Cores } = require('../utils/cores');
const { exibirErro } = require('../ui/menu');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Remove todos os servidores (sai deles)
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function removerTodosServidores(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.REMOVE_SERVERS);

	UIComponents.exibirCabecalho('          SAIR DE TODOS OS SERVIDORES', corPrincipal);
	UIComponents.exibirInfo('Buscando lista de servidores...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const servidores = listarServidores(cliente);

	if (servidores.length === 0) {
		await exibirErro('Você não está em nenhum servidor.');
		return;
	}

	UIComponents.exibirContagem(servidores.length, 'servidor', corPrincipal);
	UIComponents.exibirInfo('Iniciando remoção...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE + 0.5);
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	let contador = 0;

	for (const servidor of servidores) {
		await sleep(delay);
		await servidor
			.leave()
			.then(async () => {
				contador++;
				await exibirProgressoCompleto(
					contador,
					servidores.length,
					CONSTANTS.WINDOW_TITLES.REMOVE_SERVERS,
					'servidores removidos',
					'',
					cliente,
					Cores.principal(config.cor_painel)
				);

				await atualizarPresenca({
					detalhe: `Removendo servidores ${contador}/${servidores.length} [${Math.round((contador / servidores.length) * 100)}%]`
				});
			})
			.catch(() => {});
	}

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
}

module.exports = {
	removerTodosServidores
};
