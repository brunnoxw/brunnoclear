const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirProgressoCompleto } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { listarDMsAbertas } = require('../services/discord');
const { Cores } = require('../utils/cores');
const { exibirErro } = require('../ui/menu');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Fecha todas as DMs abertas
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function fecharTodasDMs(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CLOSE_DMS);

	UIComponents.exibirCabecalho('          FECHAR TODAS AS DMs', corPrincipal);
	UIComponents.exibirInfo('Buscando DMs abertas...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const dms = listarDMsAbertas(cliente);

	if (dms.length === 0) {
		await exibirErro('Você não tem DMs abertas.');
		return;
	}

	UIComponents.exibirContagem(dms.length, 'DM', corPrincipal);
	UIComponents.exibirInfo('Iniciando fechamento...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE + 0.5);
	const config = obterConfig();
	let contador = 0;

	for (const dm of dms) {
		await sleep(CONSTANTS.DELAYS.DM_CLOSE);
		await dm
			.delete()
			.then(async () => {
				contador++;
				await exibirProgressoCompleto(
					contador,
					dms.length,
					CONSTANTS.WINDOW_TITLES.CLOSE_DMS,
					'DMs fechadas',
					'',
					cliente,
					Cores.principal(config.cor_painel)
				);

				await atualizarPresenca({
					detalhe: `Fechando DMs ${contador}/${dms.length} [${Math.round((contador / dms.length) * 100)}%]`
				});
			})
			.catch(() => {});
	}

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
}

module.exports = {
	fecharTodasDMs
};
