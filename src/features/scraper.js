const readlineSync = require('readline-sync');
const { Cores, Simbolos, textoRainbow } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');
const { obterConfig } = require('../config/configuracao');

function isValidUrl(string) {
	try {
		new URL(string);
		return true;
	} catch (_) {
		return false;
	}
}

function isValidFileType(url, tipoArquivo) {
	const urlLower = url.toLowerCase();

	switch (tipoArquivo) {
		case 'png/jpg':
			return urlLower.includes('.png') || urlLower.includes('.jpg') || urlLower.includes('.jpeg');
		case 'gif':
			return urlLower.includes('.gif');
		case 'todos':
			return (
				urlLower.includes('.png') ||
				urlLower.includes('.jpg') ||
				urlLower.includes('.jpeg') ||
				urlLower.includes('.gif')
			);
		default:
			return false;
	}
}

async function buscarMensagens(canal, ultimoId = null) {
	return await canal.messages.fetch({
		limit: 100,
		...(ultimoId && { before: ultimoId })
	});
}

async function enviarViaWebhook(webhookUrl, imageUrls, delay) {
	try {
		const formData = new FormData();
		for (let i = 0; i < imageUrls.length; i++) {
			const url = imageUrls[i];
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();
			const blob = new Blob([arrayBuffer]);
			const extension = url.split('.').pop().split('?')[0];
			formData.append(`file${i}`, blob, `image${i}.${extension}`);
		}

		const webhookResponse = await fetch(webhookUrl, {
			method: 'POST',
			body: formData
		});

		if (!webhookResponse.ok) {
			throw new Error(`HTTP ${webhookResponse.status}: ${webhookResponse.statusText}`);
		}

		await sleep(delay);
		return true;
	} catch (error) {
		throw new Error(`Erro ao enviar via webhook: ${error.message}`);
	}
}

async function enviarViaConta(canal, imageUrls, delay) {
	try {
		await canal.send({
			files: imageUrls
		});

		await sleep(delay);
		return true;
	} catch (error) {
		throw new Error(`Erro ao enviar via conta: ${error.message}`);
	}
}

function chunkArray(array, size) {
	const chunks = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

function exibirBarraProgresso(atual, total, cor, corPrincipal) {
	const largura = 30;
	const progresso = Math.floor((atual / total) * largura);
	const porcentagem = Math.floor((atual / total) * 100);

	const barra = '█'.repeat(progresso) + '░'.repeat(largura - progresso);
	const textoProgresso = `${atual}/${total}`;

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);

	if (corPrincipal === 'rainbow') {
		process.stdout.write(`        ${textoRainbow(`[${barra}]`)} ${porcentagem}% | ${textoProgresso}`);
	} else {
		process.stdout.write(`        ${cor}[${barra}]${Cores.reset} ${porcentagem}% | ${textoProgresso}`);
	}
}

async function scraperIcons(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Scraper de Icons');

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirCabecalho('          SCRAPER DE ICONS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Selecione o tipo de arquivo:', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu('1', 'PNG/JPG apenas', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'GIF apenas', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', 'Todos os tipos', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcaoTipo = readlineSync.question(UIComponents.obterPrompt());
	let tipoArquivo;
	switch (opcaoTipo) {
		case '1':
			tipoArquivo = 'png/jpg';
			break;
		case '2':
			tipoArquivo = 'gif';
			break;
		case '3':
			tipoArquivo = 'todos';
			break;
		default:
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('Opção inválida!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          CANAL DE ORIGEM', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Digite o ID do canal de origem:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const idCanalOrigem = readlineSync.question(UIComponents.obterPrompt());
	const canalOrigem = cliente.channels.cache.get(idCanalOrigem);

	if (!canalOrigem) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Canal não encontrado!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	if (canalOrigem.guild) {
		const permissoes = canalOrigem.permissionsFor(canalOrigem.guild.members.me);
		if (!permissoes.has(['ViewChannel', 'ReadMessageHistory'])) {
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('Sem permissão para ler mensagens neste canal!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
			return;
		}
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          MÉTODO DE ENVIO', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Como deseja enviar as imagens?', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu('1', 'Via Webhook (fornecido por você)', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Via Conta (canal do Discord)', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcaoMetodo = readlineSync.question(UIComponents.obterPrompt());
	let metodoEnvio, webhookUrl, canalDestino;
	if (opcaoMetodo === '1') {
		metodoEnvio = 'webhook';

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          WEBHOOK URL', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Cole a URL do webhook:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		webhookUrl = readlineSync.question(UIComponents.obterPrompt());

		if (!isValidUrl(webhookUrl) || !webhookUrl.includes('discord.com/api/webhooks/')) {
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('URL de webhook inválida!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}
	} else if (opcaoMetodo === '2') {
		metodoEnvio = 'conta';

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          CANAL DE DESTINO', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do canal de destino:', corPrincipal);
		UIComponents.exibirLinhaVazia();
		const idCanalDestino = readlineSync.question(UIComponents.obterPrompt());
		canalDestino = cliente.channels.cache.get(idCanalDestino);

		if (!canalDestino) {
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('Canal de destino não encontrado!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}
		if (canalDestino.guild) {
			const permissoes = canalDestino.permissionsFor(canalDestino.guild.members.me);
			if (!permissoes.has(['ViewChannel', 'SendMessages', 'AttachFiles'])) {
				UIComponents.limparTela();
				exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
				UIComponents.exibirLinhaVazia();
				UIComponents.exibirErroMensagem('Sem permissão para enviar arquivos neste canal!', corPrincipal);
				UIComponents.exibirLinhaVazia();
				await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
				return;
			}
		}
	} else {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Opção inválida!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          QUANTIDADE POR MENSAGEM', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Quantas imagens por mensagem? (1-10)', corPrincipal);
	UIComponents.exibirLinhaVazia();
	const qtdPorMensagem = parseInt(readlineSync.question(UIComponents.obterPrompt()));

	if (isNaN(qtdPorMensagem) || qtdPorMensagem < 1 || qtdPorMensagem > 10) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Quantidade inválida! Use 1-10', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          ESTRATÉGIA', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Escolha a estratégia:', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirOpcaoMenu('1', 'Coletar tudo primeiro, depois enviar', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Coletar em blocos de 100 e enviar', corPrincipal);
	UIComponents.exibirLinhaVazia();
	const opcaoEstrategia = readlineSync.question(UIComponents.obterPrompt());

	if (opcaoEstrategia !== '1' && opcaoEstrategia !== '2') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Opção inválida!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	const estrategia = opcaoEstrategia === '1' ? 'tudo' : 'blocos';

	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1.0;

	await atualizarPresenca({
		detalhe: 'Scraper de Icons',
		estado: 'Coletando imagens...'
	});

	let todasUrls = [];
	let ultimoId = null;
	let totalBuscadas = 0;
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let frameIndex = 0;
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          COLETANDO IMAGENS', corPrincipal);

	console.log();
	const loadingInterval = setInterval(() => {
		const frame = frames[frameIndex % frames.length];
		const textoCarregando =
			corPrincipal === 'rainbow'
				? textoRainbow(`Buscando... ${todasUrls.length} imagens encontradas`)
				: `${cor}Buscando...${reset} ${todasUrls.length} imagens encontradas`;

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`        ${frame} ${textoCarregando}   `);
		frameIndex++;
	}, 80);
	while (true) {
		try {
			const fetched = await buscarMensagens(canalOrigem, ultimoId);

			if (fetched.size === 0) break;
			for (const msg of fetched.values()) {
				if (msg.attachments.size > 0) {
					for (const attachment of msg.attachments.values()) {
						const url = attachment.url;
						if (isValidFileType(url, tipoArquivo)) {
							todasUrls.push(url);
						}
					}
				}
			}

			totalBuscadas += fetched.size;
			ultimoId = fetched.lastKey();

			await atualizarPresenca({
				detalhe: 'Scraper de Icons',
				estado: `${todasUrls.length} imagens coletadas`,
				imagemPequenaTexto: 'Coletando...'
			});
			await sleep(0.5);
		} catch (error) {
			clearInterval(loadingInterval);
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem(`Erro ao buscar mensagens: ${error.message}`, corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
			return;
		}
	}

	clearInterval(loadingInterval);
	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);

	if (todasUrls.length === 0) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirAviso('Nenhuma imagem encontrada!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirCabecalho('          ENVIANDO IMAGENS', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        ${Simbolos.info} Total: ${UIComponents.textoColorido(todasUrls.length.toString(), corPrincipal, false)} imagens`
	);
	console.log(
		`        ${Simbolos.info} Delay: ${UIComponents.textoColorido(delay.toString(), corPrincipal, false)}s entre mensagens`
	);
	UIComponents.exibirLinhaVazia();
	const chunks = chunkArray(todasUrls, qtdPorMensagem);
	let enviadas = 0;
	let erros = 0;

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];

		try {
			if (metodoEnvio === 'webhook') {
				await enviarViaWebhook(webhookUrl, chunk, delay);
			} else {
				await enviarViaConta(canalDestino, chunk, delay);
			}

			enviadas += chunk.length;

			exibirBarraProgresso(i + 1, chunks.length, cor, corPrincipal);

			await atualizarPresenca({
				detalhe: 'Scraper de Icons',
				estado: `${enviadas}/${todasUrls.length} enviadas`,
				imagemPequenaTexto: `${Math.floor((enviadas / todasUrls.length) * 100)}%`
			});
		} catch (error) {
			erros += chunk.length;
			console.log(`\n        ${Simbolos.erro} Erro ao enviar chunk ${i + 1}: ${error.message}`);
		}
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          ENVIO CONCLUÍDO!', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSucesso('Imagens enviadas com sucesso!', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Estatísticas:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        ${UIComponents.textoColorido(`Enviadas: ${enviadas}/${todasUrls.length}`, corPrincipal, false)}`
	);
	if (erros > 0) {
		console.log(`        ${Simbolos.aviso} ${UIComponents.textoColorido(`Erros: ${erros}`, corPrincipal, false)}`);
	}
	console.log(`        ${UIComponents.textoColorido(`Total de mensagens: ${chunks.length}`, corPrincipal, false)}`);
	UIComponents.exibirLinhaVazia();
	console.log(`        ${Simbolos.info} Pressione ENTER para voltar ao menu`);
	UIComponents.exibirLinhaVazia();

	await atualizarPresenca({
		detalhe: 'Scraper concluído',
		estado: `${enviadas} imagens enviadas`,
		imagemPequenaTexto: 'Finalizado'
	});

	readlineSync.question('');
}

module.exports = {
	scraperIcons
};
