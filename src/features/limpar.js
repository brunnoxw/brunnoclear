const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirProgressoCompleto, exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { buscarTodasMensagens, buscarMensagensIncremental, abrirDM } = require('../services/discord');
const { Cores, Simbolos } = require('../utils/cores');
const { solicitarTexto, exibirErro } = require('../ui/menu');
const { confirmarBackup, criarBackup } = require('../services/backup');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Limpa mensagens de uma única DM
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function limparDMUnica(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CLEAN_DM);
	const { textoRainbow } = require('../utils/cores');

	UIComponents.exibirCabecalho('          LIMPAR DM ÚNICA', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do usuário ou canal:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idUsuario = solicitarTexto('');
	let nomeUsuario;
	let canal = cliente.channels.cache.get(idUsuario);
	let contador = 0;

	if (!canal) {
		const usuario = await cliente.users.fetch(idUsuario).catch(() => null);
		if (!usuario) {
			await exibirErro('Este ID é inválido.');
			return;
		}

		nomeUsuario = usuario.globalName || usuario.username;
		canal = await abrirDM(cliente, idUsuario);

		if (!canal) {
			await exibirErro('Não foi possível abrir DM com o usuário.');
			return;
		}
	} else {
		nomeUsuario = canal.recipient?.globalName || canal.recipient?.username || canal.name;
	}
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	let totalFiltradas = 0;

	const fazerBackup = await confirmarBackup(corPrincipal);

	let todasMensagensParaBackup = [];
	if (fazerBackup) {
		const { buscarTodasMensagensParaBackup } = require('../services/discord');
		todasMensagensParaBackup = await buscarTodasMensagensParaBackup(cliente, canal.id);
	}

	/**
	 * Modo incremental: busca e apaga mensagens conforme encontra
	 */
	if (config.esperar_fetch === false) {
		await buscarMensagensIncremental(
			canal,
			async (mensagens, total) => {
				totalFiltradas = total;

				for (const msg of mensagens) {
					await sleep(delay);
					await msg
						.delete()
						.then(async () => {
							contador++;
							await exibirProgressoCompleto(
								contador,
								totalFiltradas,
								'BrunnoClear | Limpar DM única',
								'mensagens removidas',
								`        ${corPrincipal === 'rainbow' ? textoRainbow('Apagando com') : corPrincipal + 'Apagando com' + reset} ${nomeUsuario}\n`,
								cliente,
								corPrincipal
							);

							await atualizarPresenca({
								estado: `${Math.round((contador / totalFiltradas) * 100)}%`,
								detalhe: `Apagando mensagens: ${contador}/${totalFiltradas}`
							});
						})
						.catch(() => {});
				}
			},
			cliente
		);
	} else {
		/**
		 * Modo completo: busca todas as mensagens antes de apagar
		 */
		const mensagens = await buscarTodasMensagens(cliente, canal.id);
		totalFiltradas = mensagens.length;

		for (const msg of mensagens) {
			await sleep(delay);
			await msg
				.delete()
				.then(async () => {
					contador++;
					await exibirProgressoCompleto(
						contador,
						totalFiltradas,
						'BrunnoClear | Limpar DM única',
						'mensagens removidas',
						`        ${corPrincipal === 'rainbow' ? textoRainbow('Apagando com') : corPrincipal + 'Apagando com' + reset} ${nomeUsuario}\n`,
						cliente,
						corPrincipal
					);

					await atualizarPresenca({
						estado: `${Math.round((contador / totalFiltradas) * 100)}%`,
						detalhe: `Apagando mensagens: ${contador}/${totalFiltradas}`
					});
				})
				.catch(() => {});
		}
	}

	if (fazerBackup && todasMensagensParaBackup.length > 0) {
		UIComponents.limparTela();
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Criando backup...', corPrincipal);
		await criarBackup(todasMensagensParaBackup, nomeUsuario, canal.recipient?.id || idUsuario, corPrincipal, true);
	}

	if (totalFiltradas === 0) {
		await exibirErro('Você não tem mensagens aí.');
	}

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
}

/**
 * Limpa mensagens de todas as DMs abertas
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 * @param {boolean} fecharApos - Se deve fechar as DMs após limpar
 */
async function limparDMsAbertas(cliente, corPrincipal, fecharApos = false) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CLEAN_DMS);

	const dms = cliente.channels.cache.filter((c) => c.type === 'DM').map((a) => a);

	if (dms.length === 0) {
		await exibirErro('Você não tem DMs abertas.');
		return;
	}
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	const { textoRainbow } = require('../utils/cores');

	const fazerBackup = await confirmarBackup(corPrincipal);

	let baixarAnexos = false;
	if (fazerBackup) {
		UIComponents.limparTela();
		UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.CLEAN_DMS);
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Deseja baixar anexos localmente?', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirOpcaoMenu('1', 'Sim, baixar todos os anexos', corPrincipal);
		UIComponents.exibirOpcaoMenu('2', 'Não, usar apenas URLs (podem expirar)', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirAviso('Isso será aplicado a todas as DMs', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const readlineSync = require('readline-sync');
		const opcaoAnexos = readlineSync.question(UIComponents.obterPrompt());
		baixarAnexos = opcaoAnexos === '1';
	}

	for (const dm of dms) {
		let contadorMsgs = 0;
		let totalFiltradas = 0;
		const nomeDestinatario = dm.recipient?.globalName || dm.recipient?.username;

		let todasMensagensParaBackup = [];
		if (fazerBackup) {
			const { buscarTodasMensagensParaBackup } = require('../services/discord');
			todasMensagensParaBackup = await buscarTodasMensagensParaBackup(cliente, dm.id);
		}

		if (config.esperar_fetch === false) {
			await buscarMensagensIncremental(
				dm,
				async (mensagens, total) => {
					totalFiltradas = total;

					for (const msg of mensagens) {
						await sleep(delay);
						await msg
							.delete()
							.then(async () => {
								contadorMsgs++;
								await exibirProgressoCompleto(
									contadorMsgs,
									totalFiltradas,
									'BrunnoClear | Limpar DMs abertas',
									'mensagens removidas',
									`        ${corPrincipal === 'rainbow' ? textoRainbow('Apagando com') : corPrincipal + 'Apagando com' + reset} ${nomeDestinatario}\n`,
									cliente,
									corPrincipal
								);

								await atualizarPresenca({
									estado: `${contadorMsgs}/${totalFiltradas}`,
									detalhe: `Apagando ${contadorMsgs}/${totalFiltradas} [${Math.round((contadorMsgs / totalFiltradas) * 100)}%]`
								});
							})
							.catch(() => {});
					}
				},
				cliente
			);
		} else {
			const mensagens = await buscarTodasMensagens(cliente, dm.id);
			totalFiltradas = mensagens.length;

			if (totalFiltradas === 0) continue;

			for (const msg of mensagens) {
				await sleep(delay);
				await msg
					.delete()
					.then(async () => {
						contadorMsgs++;
						await exibirProgressoCompleto(
							contadorMsgs,
							totalFiltradas,
							'BrunnoClear | Limpar DMs abertas',
							'mensagens removidas',
							`        ${corPrincipal === 'rainbow' ? textoRainbow('Apagando com') : corPrincipal + 'Apagando com' + reset} ${nomeDestinatario}\n`,
							cliente,
							corPrincipal
						);

						await atualizarPresenca({
							estado: `${contadorMsgs}/${totalFiltradas}`,
							detalhe: `Apagando ${contadorMsgs}/${totalFiltradas} [${Math.round((contadorMsgs / totalFiltradas) * 100)}%]`
						});
					})
					.catch(() => {});
			}
		}
		if (fazerBackup && todasMensagensParaBackup.length > 0) {
			const fs = require('fs');
			const path = require('path');

			const sanitizarNome = (nome) => nome.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
			const pastaBackups = path.join(process.cwd(), 'backups');
			let backupJaExiste = false;

			if (fs.existsSync(pastaBackups)) {
				const arquivos = fs.readdirSync(pastaBackups);
				const idUsuario = dm.recipient?.id || dm.id;
				const prefixoBusca = `${sanitizarNome(nomeDestinatario)}_${idUsuario}_`;
				backupJaExiste = arquivos.some((pasta) => pasta.startsWith(prefixoBusca));
			}
			if (!backupJaExiste) {
				UIComponents.limparTela();
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirInfo(`Criando backup de ${nomeDestinatario}...`, corPrincipal);
				await criarBackup(
					todasMensagensParaBackup,
					nomeDestinatario,
					dm.recipient?.id || dm.id,
					corPrincipal,
					false,
					baixarAnexos
				);
			} else {
				UIComponents.limparTela();
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirInfo(`Backup já existe para ${nomeDestinatario}, pulando...`, corPrincipal);
				await sleep(0.5);
			}
		}

		if (fecharApos) {
			await dm.delete().catch(() => {});
		}
	}

	await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
}

module.exports = {
	limparDMUnica,
	limparDMsAbertas
};
