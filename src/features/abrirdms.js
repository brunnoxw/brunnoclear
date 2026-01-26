const { Simbolos, Cores } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { solicitarTexto, confirmar } = require('../ui/menu');
const { exibirTitulo } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { obterConfig } = require('../config/configuracao');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');
const yauzl = require('yauzl');
const child_process = require('child_process');
const fs = require('fs');

/**
 * Seleciona arquivo ZIP via diálogo do Windows
 * @returns {Promise<string>} Caminho do arquivo selecionado
 */
async function selecionarArquivoZip() {
	if (process.platform === 'win32') {
		const psScript = `
      Function Select-ZipFileDialog {
        param([string]$Description="Selecione o ZIP do Discord", [string]$Filter="ZIP files (*.zip)|*.zip")

        [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null

        $objForm = New-Object System.Windows.Forms.OpenFileDialog
        $objForm.Filter = $Filter
        $objForm.Title = $Description
        $Show = $objForm.ShowDialog()
        If ($Show -eq "OK") {
            Return $objForm.FileName
        }
      }

      $zipFile = Select-ZipFileDialog
      Write-Output $zipFile
    `;

		const child = child_process.spawnSync('powershell.exe', ['-Command', psScript], { encoding: 'utf8' });
		return child.stdout.toString().trim();
	} else {
		if (!fs.existsSync('package.zip')) {
			return null;
		}
		return 'package.zip';
	}
}

/**
 * Verifica se o canal é válido
 * @param {Object} entry - Entry do arquivo ZIP
 * @returns {boolean}
 */
function canalValido(entry) {
	return /^(?:messages?|mensagens?)\/c[0-9]+\/(?:channel|canal)\.json$/i.test(entry.fileName);
}

/**
 * Obtém dados do canal
 * @param {Object} zipfile - Arquivo ZIP aberto
 * @param {Object} entry - Entry do canal
 * @returns {Promise<Object|null>}
 */
async function dadosCanal(zipfile, entry) {
	return new Promise((resolve, reject) => {
		zipfile.openReadStream(entry, (err, readStream) => {
			if (err) {
				resolve(null);
				return;
			}

			let data = '';
			readStream.on('data', (chunk) => {
				data += chunk.toString();
			});

			readStream.on('end', () => {
				try {
					resolve(JSON.parse(data));
				} catch {
					resolve(null);
				}
			});

			readStream.on('error', () => {
				resolve(null);
			});
		});
	});
}

/**
 * Verifica se é DM (conversa 1:1)
 * @param {Object} data - Dados do canal
 * @returns {boolean}
 */
function ehDM(data) {
	return data?.type === 'DM' && data?.recipients && Array.isArray(data.recipients) && data.recipients.length > 0;
}

/**
 * Extrai apenas IDs válidos (filtra "Deleted User" e outros)
 * @param {Array} recipients - Lista de recipients
 * @returns {Array<string>}
 */
function extrairIDsValidos(recipients) {
	return recipients.filter((id) => typeof id === 'string' && /^\d+$/.test(id) && id !== 'Deleted User');
}

/**
 * Extrai IDs de usuários do package do Discord
 * @param {string} zipPath - Caminho do arquivo ZIP
 * @param {Array<string>} whitelist - Lista de IDs para ignorar
 * @param {Function} onProgress - Callback de progresso (opcional)
 * @returns {Promise<Array<string>>}
 */
async function extrairIDsDoPackage(zipPath, whitelist = [], onProgress = null) {
	return new Promise((resolve, reject) => {
		yauzl.open(zipPath, { lazyEntries: true }, async (err, zipfile) => {
			if (err) {
				reject(err);
				return;
			}

			const idsEncontrados = new Set();
			const contagemIDs = new Map();
			let totalCanais = 0;
			let canaisDM = 0;
			let totalArquivos = 0;

			zipfile.readEntry();
			zipfile.on('entry', async (entry) => {
				totalArquivos++;

				if (onProgress && totalArquivos % 50 === 0) {
					onProgress(totalArquivos, totalCanais, canaisDM, idsEncontrados.size);
				}

				if (canalValido(entry)) {
					totalCanais++;
					const channelData = await dadosCanal(zipfile, entry);

					if (channelData && ehDM(channelData)) {
						canaisDM++;

						const idsValidos = extrairIDsValidos(channelData.recipients);
						idsValidos.forEach((id) => {
							idsEncontrados.add(id);
							contagemIDs.set(id, (contagemIDs.get(id) || 0) + 1);
						});
					}

					zipfile.readEntry();
				} else {
					zipfile.readEntry();
				}
			});

			zipfile.on('end', () => {
				let idDono = null;
				let maxContagem = 0;

				for (const [id, contagem] of contagemIDs.entries()) {
					if (contagem > maxContagem) {
						maxContagem = contagem;
						idDono = id;
					}
				}

				if (idDono) {
					idsEncontrados.delete(idDono);
				}

				whitelist.forEach((id) => {
					idsEncontrados.delete(id.trim());
				});

				resolve(Array.from(idsEncontrados));
			});

			zipfile.on('error', (err) => {
				reject(err);
			});
		});
	});
}

/**
 * Abre DM com uma lista de usuários
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function abrirDMs(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela(CONSTANTS.WINDOW_TITLES.OPEN_DMS);

	atualizarPresenca({
		detalhe: 'Abrindo DMs'
	});

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          ABRIR DMS', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Selecione de onde buscar usuários:', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Amigos', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Membros de um servidor', corPrincipal);
	UIComponents.exibirOpcaoMenu('3', 'Lista de IDs (manual)', corPrincipal);
	UIComponents.exibirOpcaoMenu('4', 'Package do Discord (package.zip)', corPrincipal);
	UIComponents.exibirOpcaoMenu('5', 'Usuário específico', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const readlineSync = require('readline-sync');
	const opcao = readlineSync.question(UIComponents.obterPrompt());
	let idsUsuarios = [];

	if (opcao === '1') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          BUSCANDO AMIGOS', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Buscando lista de amigos...', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const amigos = cliente.relationships?.cache?.filter((tipo) => tipo === 1);
		if (amigos && amigos.size > 0) {
			idsUsuarios = [...amigos.keys()];
			UIComponents.exibirSucesso(`${idsUsuarios.length} amigos encontrados`, corPrincipal);
		} else {
			UIComponents.exibirAviso('Nenhum amigo encontrado', corPrincipal);
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}
	} else if (opcao === '2') {
		const idServidor = await solicitarTexto('ID do servidor:');

		const servidor = cliente.guilds.cache.get(idServidor);
		if (!servidor) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('Servidor não encontrado!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          BUSCANDO MEMBROS', corPrincipal);
		UIComponents.exibirLinhaVazia();
		console.log(
			`        ${Simbolos.info} Buscando membros do servidor "${UIComponents.textoColorido(servidor.name, corPrincipal, false)}"...`
		);
		UIComponents.exibirLinhaVazia();

		try {
			await servidor.members.fetch();
			idsUsuarios = servidor.members.cache.filter((m) => !m.user.bot && m.id !== cliente.user.id).map((m) => m.id);

			UIComponents.exibirSucesso(`${idsUsuarios.length} membros encontrados`, corPrincipal);
		} catch (erro) {
			UIComponents.exibirErroMensagem(`Erro ao buscar membros: ${erro.message}`, corPrincipal);
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}
	} else if (opcao === '3') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          LISTA DE IDS', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite um ID ou vários IDs separados por vírgula/espaço:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(`        ${UIComponents.textoColorido('Exemplo (único):', corPrincipal, false)} 123456789`);
		console.log(
			`        ${UIComponents.textoColorido('Exemplo (lista):', corPrincipal, false)} 123456789, 987654321, 555666777`
		);
		UIComponents.exibirLinhaVazia();

		const idsTexto = await solicitarTexto('ID(s):');

		idsUsuarios = idsTexto
			.split(/[,\s]+/)
			.map((id) => id.trim())
			.filter((id) => id && /^\d+$/.test(id));

		if (idsUsuarios.length === 0) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('Nenhum ID válido fornecido!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSucesso(`${idsUsuarios.length} ID(s) válido(s) encontrado(s)`, corPrincipal);
		await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
	} else if (opcao === '4') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          PACKAGE DO DISCORD', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Você precisa do pacote de dados do Discord', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(`        ${UIComponents.textoColorido('Como obter:', corPrincipal, false)}`);
		console.log(`        Configurações > Dados e privacidade > Solicitar dados`);
		console.log(`        Marque "Mensagens" e aguarde o ZIP chegar no e-mail`);
		UIComponents.exibirLinhaVazia();

		UIComponents.exibirInfo('Abrindo seletor de arquivos...', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const zipPath = await selecionarArquivoZip();

		if (!zipPath) {
			UIComponents.exibirErroMensagem('Nenhum arquivo selecionado!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		if (!fs.existsSync(zipPath)) {
			UIComponents.exibirErroMensagem('Arquivo não encontrado!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('IDs para ignorar (separados por vírgula)', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(`        ${UIComponents.textoColorido('Exemplo:', corPrincipal, false)} 123456789, 987654321`);
		console.log(`        ${UIComponents.textoColorido('Deixe vazio para abrir DM com TODOS', corPrincipal, false)}`);
		UIComponents.exibirLinhaVazia();

		const whitelistInput = await solicitarTexto('');
		const whitelist = whitelistInput ? whitelistInput.split(',').map((id) => id.trim()) : [];

		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Analisando package do Discord...', corPrincipal);
		UIComponents.exibirLinhaVazia();

		console.log(
			`        ${UIComponents.textoColorido('Isso pode demorar alguns minutos para arquivos grandes', corPrincipal, false)}`
		);
		UIComponents.exibirLinhaVazia();

		try {
			idsUsuarios = await extrairIDsDoPackage(zipPath, whitelist, (totalArquivos, totalCanais, canaisDM, idsUnicos) => {
				process.stdout.write(
					`\r        ${Simbolos.carregando} Arquivos processados: ${totalArquivos} | Canais: ${totalCanais} | DMs: ${canaisDM} | IDs únicos: ${idsUnicos}   `
				);
			});

			process.stdout.write('\r' + ' '.repeat(120) + '\r');
		} catch (error) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem(`Erro ao processar package: ${error.message}`, corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
			return;
		}

		if (idsUsuarios.length === 0) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirAviso('Nenhum usuário encontrado no package!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		UIComponents.exibirSucesso(`${idsUsuarios.length} usuários encontrados no package`, corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
	} else if (opcao === '5') {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('          USUÁRIO ESPECÍFICO', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Digite o ID do usuário:', corPrincipal);
		UIComponents.exibirLinhaVazia();

		const idUsuario = await solicitarTexto('ID do usuário:');

		if (!idUsuario || !/^\d+$/.test(idUsuario.trim())) {
			UIComponents.exibirLinhaVazia();
			UIComponents.exibirErroMensagem('ID inválido!', corPrincipal);
			await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
			return;
		}

		idsUsuarios = [idUsuario.trim()];

		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSucesso('ID válido!', corPrincipal);
		await sleep(CONSTANTS.DELAYS.SHORT_PAUSE);
	} else {
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirErroMensagem('Opção inválida!', corPrincipal);
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo(`Total de usuários: ${idsUsuarios.length}`, corPrincipal);
	const continuar = confirmar('Deseja abrir DM com todos esses usuários?');

	if (!continuar) {
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirInfo('Operação cancelada', corPrincipal);
		await sleep(CONSTANTS.DELAYS.MESSAGE_DISPLAY);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          ABRINDO DMS', corPrincipal);
	let abertas = 0;
	let erros = 0;
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	for (let i = 0; i < idsUsuarios.length; i++) {
		await sleep(delay);

		try {
			await cliente.api.users(cliente.user.id).channels.post({
				data: {
					recipients: [idsUsuarios[i]]
				}
			});

			abertas++;
			console.log(`        ${Simbolos.sucesso} [${i + 1}/${idsUsuarios.length}] DM aberta com ID: ${idsUsuarios[i]}`);

			await atualizarPresenca({
				detalhe: `Abrindo DMs ${abertas}/${idsUsuarios.length} [${Math.round((abertas / idsUsuarios.length) * 100)}%]`
			});
		} catch (erro) {
			erros++;

			if (erro.code === 40007 || erro.message?.includes('Cannot send messages')) {
				console.log(`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] Bloqueado: ${idsUsuarios[i]}`);
			} else if (erro.code === 50007 || erro.message?.includes('Cannot send')) {
				console.log(`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] DMs desativadas: ${idsUsuarios[i]}`);
			} else if (erro.message?.includes('Unauthorized') || erro.code === 40001) {
				console.log(`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] Não autorizado: ${idsUsuarios[i]}`);
			} else if (erro.code === 10013 || erro.message?.includes('Unknown User')) {
				console.log(`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] ID inválido: ${idsUsuarios[i]}`);
			} else if (erro.code === 50033 || erro.message?.includes('Invalid Recipient')) {
				console.log(`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] Usuário inválido: ${idsUsuarios[i]}`);
			} else {
				console.log(
					`        ${Simbolos.erro} [${i + 1}/${idsUsuarios.length}] Erro (${erro.code || 'N/A'}): ${erro.message || 'Desconhecido'}`
				);
			}
		}
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          RESULTADO', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirSucesso(`DMs abertas: ${abertas}`, corPrincipal);
	if (erros > 0) {
		UIComponents.exibirErroMensagem(`Erros: ${erros}`, corPrincipal);
	}
	UIComponents.exibirLinhaVazia();

	await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
}

module.exports = { abrirDMs };
