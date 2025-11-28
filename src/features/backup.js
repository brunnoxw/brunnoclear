const { obterConfig } = require('../config/configuracao');
const { sleep } = require('../utils/sleep');
const { exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { abrirDM } = require('../services/discord');
const { Cores, Simbolos } = require('../utils/cores');
const { solicitarTexto, exibirErro, exibirSucesso } = require('../ui/menu');
const { criarBackup } = require('../services/backup');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

/**
 * Busca todas as mensagens de um canal
 */
async function buscarTodasMensagensBackup(canal, callback) {
	const mensagens = [];
	let ultimoId = null;
	let totalBuscado = 0;

	while (true) {
		const opcoes = { limit: 100 };
		if (ultimoId) opcoes.before = ultimoId;

		const lote = await canal.messages.fetch(opcoes);
		if (lote.size === 0) break;

		const loteArray = Array.from(lote.values()).reverse();
		mensagens.push(...loteArray);
		totalBuscado += lote.size;

		ultimoId = lote.last().id;

		if (callback) await callback(totalBuscado);

		await sleep(0.5);

		if (lote.size < 100) break;
	}

	return mensagens.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/**
 * Cria backup de mensagens de uma DM (Feature do painel)
 */
async function criarBackupMensagens(cliente, corPrincipal) {
	const readlineSync = require('readline-sync');

	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.BACKUP);

	const config = obterConfig();
	const { textoRainbow } = require('../utils/cores');

	await atualizarPresenca({ detalhe: 'Criando backup de mensagens' });

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          BACKUP DE MENSAGENS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do usuário ou canal da DM:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idUsuario = readlineSync.question(UIComponents.obterPrompt()).trim();

	let canal = cliente.channels.cache.get(idUsuario);
	let nomeUsuario, idCanalUsuario;

	if (!canal) {
		const usuario = await cliente.users.fetch(idUsuario).catch(() => null);
		if (!usuario) {
			await exibirErro('Este ID é inválido.');
			return;
		}

		nomeUsuario = usuario.globalName || usuario.username;
		idCanalUsuario = usuario.id;
		canal = await abrirDM(cliente, idUsuario);

		if (!canal) {
			await exibirErro('Não foi possível abrir DM com o usuário.');
			return;
		}
	} else {
		nomeUsuario = canal.recipient?.globalName || canal.recipient?.username || canal.name;
		idCanalUsuario = canal.recipient?.id || canal.id;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          BACKUP DE MENSAGENS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	console.log(
		`        ${Simbolos.info} Buscando mensagens com ${UIComponents.textoColorido(nomeUsuario, corPrincipal, false)}...`
	);
	UIComponents.exibirLinhaVazia();

	const mensagens = await buscarTodasMensagensBackup(canal, async (total) => {
		process.stdout.write(
			`\r        ${Simbolos.info} Buscadas: ${UIComponents.textoColorido(total.toString(), corPrincipal, false)} mensagens...`
		);
		await atualizarPresenca({ detalhe: `Buscando mensagens: ${total}` });
	});

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSucesso(`Total de mensagens encontradas: ${mensagens.length}`, corPrincipal);

	if (mensagens.length === 0) {
		await exibirErro('Nenhuma mensagem encontrada nesta DM.');
		return;
	}

	const caminhoArquivo = await criarBackup(mensagens, nomeUsuario, idCanalUsuario, corPrincipal, true);

	await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);

	UIComponents.exibirLinhaVazia();
	console.log(`        ${Simbolos.info} Deseja abrir o arquivo agora? ${Cores.verde}[s/n]${Cores.reset}`);
	UIComponents.exibirLinhaVazia();

	const resposta = readlineSync.question(UIComponents.obterPrompt()).trim();

	if (resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim') {
		const { spawn } = require('child_process');
		const comando = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';

		spawn(comando, [caminhoArquivo], { shell: true, detached: true });
		await exibirSucesso('Arquivo aberto no navegador!');
	}

	await sleep(0.5);
}

module.exports = {
	criarBackupMensagens
};
