const readlineSync = require('readline-sync');
const { obterConfig, atualizarPropriedade } = require('../config/configuracao');
const { Cores, Simbolos, hexParaAnsi, textoRainbow } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { exibirMenuConfig, exibirErro, solicitarTexto } = require('../ui/menu');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Menu de configurações do aplicativo
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function menuConfiguracao(cliente, corPrincipal) {
	const acoesMenu = [
		{ id: '1', action: () => configurarDelay() },
		{ id: '2', action: () => configurarCor() },
		{ id: '3', action: () => configurarEsperaFetch(cliente, corPrincipal) },
		{ id: '4', action: () => null }
	];

	while (true) {
		const config = obterConfig();
		const opcao = await exibirMenuConfig(cliente, config, corPrincipal);

		const acaoEncontrada = acoesMenu.find((item) => item.id === opcao);

		if (acaoEncontrada) {
			const resultado = await acaoEncontrada.action();

			if (resultado === null && opcao === '4') {
				return;
			}
		} else {
			await exibirErro('Opção inválida, tente novamente.', 1.5);
		}
	}
}

/**
 * Configurar delay entre ações
 */
async function configurarDelay() {
	const config = obterConfig();
	const corPrincipal = config.cor_painel === 'rainbow' ? 'rainbow' : hexParaAnsi(config.cor_painel);

	UIComponents.limparTela();
	UIComponents.exibirCabecalho('          CONFIGURAR DELAY', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o delay em segundos:', corPrincipal);
	UIComponents.exibirInfo('Exemplo: 1.5 (para 1 segundo e meio)', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const delayInput = solicitarTexto('');

	const delayEmSegundos = parseFloat(delayInput);
	if (isNaN(delayEmSegundos) || delayEmSegundos <= 0) {
		await exibirErro('Isso não é um delay válido.');
	} else {
		atualizarPropriedade('delay', delayEmSegundos.toString());
		UIComponents.limparTela();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirSucesso(`Delay alterado para ${delayEmSegundos} segundos`, corPrincipal);
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
	}
}

/**
 * Configurar cor do painel
 */
async function configurarCor() {
	const config = obterConfig();
	const corPrincipal = config.cor_painel === 'rainbow' ? 'rainbow' : hexParaAnsi(config.cor_painel);

	const acoesMenu = [
		{
			id: '1',
			action: async () => {
				UIComponents.limparTela();
				UIComponents.exibirCabecalho('          INSERIR COR HEX', corPrincipal);
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirInfo('Digite o código HEX da cor:', corPrincipal);
				UIComponents.exibirInfo('Exemplo: #faa7e8', corPrincipal);
				UIComponents.exibirLinhaVazia();

				const cor = solicitarTexto('');

				try {
					hexParaAnsi(cor);
					atualizarPropriedade('cor_painel', cor);
					UIComponents.limparTela();
					UIComponents.exibirSeparador(corPrincipal);
					UIComponents.exibirSucesso('Cor trocada com sucesso!', corPrincipal);
					UIComponents.exibirInfo('Reinicie o programa para aplicar as alterações.', corPrincipal);
					UIComponents.exibirSeparador(corPrincipal);
					UIComponents.exibirLinhaVazia();
					await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
					process.exit(0);
				} catch {
					await exibirErro('Isso não é uma cor HEX válida.');
				}
			}
		},
		{
			id: '2',
			action: async () => {
				atualizarPropriedade('cor_painel', 'rainbow');
				UIComponents.limparTela();
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirSucesso('Tema Rainbow ativado!', corPrincipal);
				UIComponents.exibirInfo('Reinicie o programa para aplicar as alterações.', corPrincipal);
				UIComponents.exibirSeparador(corPrincipal);
				UIComponents.exibirLinhaVazia();
				await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
				process.exit(0);
			}
		}
	];

	UIComponents.limparTela();
	UIComponents.exibirCabecalho('          CONFIGURAR COR DO PAINEL', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Inserir código HEX (ex: #faa7e8)', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Tema Rainbow (gradiente colorido)', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcao = solicitarTexto('');

	const acaoEncontrada = acoesMenu.find((item) => item.id === opcao);

	if (acaoEncontrada) {
		await acaoEncontrada.action();
	} else {
		await exibirErro('Opção inválida.');
	}
}

/**
 * Configurar modo de espera de fetch
 */
async function configurarEsperaFetch(cliente, corPrincipal) {
	const acoesSubmenu = [
		{
			id: '1',
			action: () => {
				const config = obterConfig();
				atualizarPropriedade('esperar_fetch', !config.esperar_fetch);
			}
		},
		{ id: '2', action: () => null }
	];

	while (true) {
		UIComponents.limparTela();
		const config = obterConfig();
		const ativo = Cores.ativo();
		const vermelho = Cores.vermelho;
		const reset = Cores.reset;

		UIComponents.exibirCabecalho('          ESPERAR FETCH DE MENSAGENS', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Aguardar a obtenção de TODAS as mensagens antes de apagar?', corPrincipal);
		console.log(
			`        ${Simbolos.info} Estado atual: ${config.esperar_fetch ? `${ativo}Ativado${reset}` : `${vermelho}Desativado${reset}`}`
		);
		UIComponents.exibirLinhaVazia();

		UIComponents.exibirOpcaoMenu('1', 'Alterar estado', corPrincipal);
		UIComponents.exibirOpcaoMenu('2', 'Voltar', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const opcao = readlineSync.question(UIComponents.obterPrompt());

		const acaoEncontrada = acoesSubmenu.find((item) => item.id === opcao);

		if (acaoEncontrada) {
			const resultado = await acaoEncontrada.action();

			if (resultado === null && opcao === '2') {
				return;
			}
		} else {
			await exibirErro('Opção inválida, tente novamente.', 1.5);
		}
	}
}

module.exports = {
	menuConfiguracao
};
