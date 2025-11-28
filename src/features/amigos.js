const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirProgressoCompleto } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { listarRelacionamentos } = require('../services/discord');
const { Cores } = require('../utils/cores');
const { exibirErro } = require('../ui/menu');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Remove todos os amigos
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function removerTodosAmigos(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.REMOVE_FRIENDS);

	UIComponents.exibirCabecalho('          REMOVER TODOS OS AMIGOS', corPrincipal);
	UIComponents.exibirInfo('Buscando lista de amigos...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const amigos = listarRelacionamentos(cliente, CONSTANTS.DISCORD.RELATIONSHIP_TYPES.FRIEND);

	if (amigos.length === 0) {
		await exibirErro('Você não tem amigos :(', CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}

	UIComponents.exibirContagem(amigos.length, 'amigo', corPrincipal);
	UIComponents.exibirInfo('Iniciando remoção...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE + 0.5);
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	let contador = 0;

	for (const idAmigo of amigos) {
		await sleep(delay);

		try {
			await cliente.api.users['@me'].relationships[idAmigo].delete({
				DiscordContext: { location: 'ContextMenu' }
			});

			contador++;
			await exibirProgressoCompleto(
				contador,
				amigos.length,
				CONSTANTS.WINDOW_TITLES.REMOVE_FRIENDS,
				'amigos removidos',
				'',
				cliente,
				Cores.principal(config.cor_painel)
			);

			await atualizarPresenca({
				detalhe: `Removendo amigos ${contador}/${amigos.length} [${Math.round((contador / amigos.length) * 100)}%]`
			});
		} catch (error) {
			contador++;
		}
	}

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
}

module.exports = {
	removerTodosAmigos
};
