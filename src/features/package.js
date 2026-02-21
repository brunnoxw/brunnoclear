const yauzl = require('yauzl');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const { Simbolos, Cores } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const { solicitarTexto } = require('../ui/menu');
const { exibirTitulo, exibirProgressoCompleto } = require('../ui/titulo');
const { atualizarPresenca } = require('../services/rpc');
const { obterConfig } = require('../config/configuracao');
const { buscarMensagensIncremental, buscarTodasMensagens } = require('../services/discord');
const { confirmarBackup, criarBackup } = require('../services/backup');
const UIComponents = require('../utils/components');
const CONSTANTS = require('../config/constants');

const PROGRESS_FILE = path.join(process.cwd(), '.package_progress.json');

/**
 * Salva o progresso da limpeza
 * @param {string} zipPath - Caminho do ZIP
 * @param {Array<string>} idsProcessados - IDs já processados
 * @param {number} totalMensagensApagadas - Total de mensagens apagadas
 */
function salvarProgresso(zipPath, idsProcessados, totalMensagensApagadas) {
	try {
		const progresso = {
			zipPath: zipPath,
			timestamp: Date.now(),
			idsProcessados: idsProcessados,
			totalMensagensApagadas: totalMensagensApagadas
		};
		fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progresso, null, 2));
	} catch (erro) {
		console.error('Erro ao salvar progresso:', erro.message);
	}
}

/**
 * Carrega o progresso salvo
 * @param {string} zipPath - Caminho do ZIP atual
 * @returns {Object|null} Progresso salvo ou null
 */
function carregarProgresso(zipPath) {
	try {
		if (fs.existsSync(PROGRESS_FILE)) {
			const progresso = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
			if (progresso.zipPath === zipPath) {
				return progresso;
			}
		}
	} catch (erro) {
		console.error('Erro ao carregar progresso:', erro.message);
	}
	return null;
}

/**
 * Limpa o arquivo de progresso
 */
function limparProgresso() {
	try {
		if (fs.existsSync(PROGRESS_FILE)) {
			fs.unlinkSync(PROGRESS_FILE);
		}
	} catch (erro) {
		console.error('Erro ao limpar progresso:', erro.message);
	}
}

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
 * Verifica se o canal é válido (suporta português e inglês, maiúsculas e minúsculas)
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
 * Limpa mensagens de uma DM específica
 * @param {Object} cliente - Cliente Discord
 * @param {Object} canal - Canal DM
 * @param {number} contador - Contador atual
 * @param {number} total - Total de DMs
 * @param {string} corPrincipal - Cor principal
 * @param {boolean} fazerBackup - Se deve fazer backup das mensagens
 * @param {boolean} baixarAnexos - Se deve baixar anexos localmente (não pergunta novamente)
 * @returns {Promise<number>} Total de mensagens apagadas
 */
async function limparMensagensDM(
	cliente,
	canal,
	contador,
	total,
	corPrincipal,
	fazerBackup = false,
	baixarAnexos = false
) {
	const config = obterConfig();
	const delay = parseFloat(config.delay) || 1;
	const { textoRainbow } = require('../utils/cores');
	const { exibirProgressoDuplo } = require('../ui/titulo');
	let mensagensApagadas = 0;

	const nomeCanal = canal.recipient?.globalName || canal.recipient?.username || canal.name || 'Desconhecido';
	const cor = corPrincipal;
	const reset = Cores.reset;
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let frameIndex = 0;
	let mensagensBuscadas = 0;
	let mensagensUsuario = 0;
	
	const textoInicial =
		corPrincipal === 'rainbow'
			? `        ${textoRainbow('📥 Buscando mensagens com')} ${nomeCanal}\n`
			: `        ${cor}📥 Buscando mensagens com${reset} ${nomeCanal}\n`;

	await exibirProgressoCompleto(
		contador,
		total,
		'BrunnoClear | Apagar package',
		'DMs processadas',
		textoInicial,
		cliente,
		corPrincipal
	);
	const loadingInterval = setInterval(() => {
		const frame = frames[frameIndex % frames.length];
		const textoCarregando =
			corPrincipal === 'rainbow'
				? textoRainbow(`Coletando mensagens... ${mensagensBuscadas} encontradas`)
				: `${cor}Coletando mensagens...${reset} ${mensagensBuscadas} encontradas`;

		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`        ${frame} ${textoCarregando}   `);
		frameIndex++;
	}, 80);

	let todasMensagensParaBackup = [];
	if (fazerBackup) {
		const { buscarTodasMensagensParaBackup } = require('../services/discord');
		todasMensagensParaBackup = await buscarTodasMensagensParaBackup(cliente, canal.id, (totalBuscadas) => {
			mensagensBuscadas = totalBuscadas;
		});
	}
	
	const mensagensOriginais = await buscarTodasMensagens(cliente, canal.id, (totalBuscadas, totalFiltradas) => {
		if (!fazerBackup) {
			mensagensBuscadas = totalBuscadas;
		}
		mensagensUsuario = totalFiltradas;
	});

	clearInterval(loadingInterval);

	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	const totalMensagens = mensagensOriginais.length;

	const dmRealmenteVazia = fazerBackup ? todasMensagensParaBackup.length === 0 : totalMensagens === 0;

	if (dmRealmenteVazia) {
		const textoVazio =
			corPrincipal === 'rainbow' ? `        ${textoRainbow('✓ DM vazia')}\n` : `        ${cor}✓ DM vazia${reset}\n`;

		await exibirProgressoCompleto(
			contador,
			total,
			'BrunnoClear | Apagar package',
			'DMs processadas',
			textoVazio,
			cliente,
			corPrincipal
		);

		await atualizarPresenca({
			estado: `${contador}/${total} DMs processadas`,
			detalhe: `Package - ${Math.round((contador / total) * 100)}%`,
			imagemPequenaTexto: `DM vazia`
		});

		await sleep(0.8);
		await canal.delete().catch(() => {});
		return 0;
	}

	if (fazerBackup && todasMensagensParaBackup.length > 0) {
		const fs = require('fs');
		const path = require('path');
		const nomeUsuario = nomeCanal;
		const idUsuario = canal.recipient?.id || canal.id;

		const sanitizarNome = (nome) => nome.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');

		const pastaBackups = path.join(process.cwd(), 'backups');
		let backupJaExiste = false;

		if (fs.existsSync(pastaBackups)) {
			const arquivos = fs.readdirSync(pastaBackups);
			const prefixoBusca = `${sanitizarNome(nomeUsuario)}_${idUsuario}_`;
			backupJaExiste = arquivos.some((pasta) => pasta.startsWith(prefixoBusca));
		}
		if (backupJaExiste) {
			const textoPulado =
				corPrincipal === 'rainbow'
					? `        ${textoRainbow('⏭️  Backup já existe, pulando...')}\n`
					: `        ${cor}⏭️  Backup já existe, pulando...${reset}\n`;

			await exibirProgressoCompleto(
				contador,
				total,
				'BrunnoClear | Apagar package',
				'DMs processadas',
				textoPulado,
				cliente,
				corPrincipal
			);

			await atualizarPresenca({
				estado: `${contador}/${total} DMs processadas`,
				detalhe: `Backup já existe - pulando`,
				imagemPequenaTexto: `Package ${Math.round((contador / total) * 100)}%`
			});

			await sleep(0.5);
		} else {
			const totalMensagensBackup = todasMensagensParaBackup.length;
			const textoBackup =
				corPrincipal === 'rainbow'
					? `        ${textoRainbow(`💾 Criando backup (${totalMensagensBackup} msgs)`)}\n`
					: `        ${cor}💾 Criando backup${reset} (${totalMensagensBackup} msgs)\n`;

			await exibirProgressoCompleto(
				contador,
				total,
				'BrunnoClear | Apagar package',
				'DMs processadas',
				textoBackup,
				cliente,
				corPrincipal
			);

			await atualizarPresenca({
				estado: `${contador}/${total} DMs processadas`,
				detalhe: `Criando backup (${totalMensagensBackup} msgs)`,
				imagemPequenaTexto: `Package ${Math.round((contador / total) * 100)}%`
			});

			try {
				await criarBackup(
					todasMensagensParaBackup,
					nomeCanal,
					canal.recipient?.id || canal.id,
					corPrincipal,
					false,
					baixarAnexos
				);

				const textoBackupOk =
					corPrincipal === 'rainbow'
						? `        ${textoRainbow('✓ Backup criado com sucesso')}\n`
						: `        ${cor}✓ Backup criado com sucesso${reset}\n`;

				await exibirProgressoCompleto(
					contador,
					total,
					'BrunnoClear | Apagar package',
					'DMs processadas',
					textoBackupOk,
					cliente,
					corPrincipal
				);

				await sleep(0.5);
			} catch (erro) {
				const textoErroBackup =
					corPrincipal === 'rainbow'
						? `        ${textoRainbow('⚠ Erro ao criar backup')}\n        ${Simbolos.aviso} Continuando...\n`
						: `        ${cor}⚠ Erro ao criar backup${reset}\n        ${Simbolos.aviso} Continuando...\n`;

				await exibirProgressoCompleto(
					contador,
					total,
					'BrunnoClear | Apagar package',
					'DMs processadas',
					textoErroBackup,
					cliente,
					corPrincipal
				);

				await sleep(1);
			}
		}
	}
	
	if (totalMensagens === 0) {
		const textoSemMensagens =
			corPrincipal === 'rainbow'
				? `        ${textoRainbow('✓ Sem mensagens suas para apagar')}\n`
				: `        ${cor}✓ Sem mensagens suas para apagar${reset}\n`;

		await exibirProgressoCompleto(
			contador,
			total,
			'BrunnoClear | Apagar package',
			'DMs processadas',
			textoSemMensagens,
			cliente,
			corPrincipal
		);

		await atualizarPresenca({
			estado: `${contador}/${total} DMs processadas`,
			detalhe: `Package - ${Math.round((contador / total) * 100)}%`,
			imagemPequenaTexto: `Sem mensagens suas`
		});

		await sleep(0.8);
		await canal.delete().catch(() => {});
		return 0;
	}
	
	for (let i = 0; i < mensagensOriginais.length; i++) {
		await sleep(delay);
		await mensagensOriginais[i]
			.delete()
			.then(async () => {
				mensagensApagadas++;
				if (mensagensApagadas % 2 === 0 || mensagensApagadas === totalMensagens) {
					const textoApagando =
						corPrincipal === 'rainbow'
							? `        ${textoRainbow('🗑️  Apagando mensagens com')} ${nomeCanal}\n`
							: `        ${cor}🗑️  Apagando mensagens com${reset} ${nomeCanal}\n`;

					await exibirProgressoDuplo(
						contador,
						total,
						mensagensApagadas,
						totalMensagens,
						textoApagando,
						cliente,
						corPrincipal
					);

					const progressoDM = Math.round((mensagensApagadas / totalMensagens) * 100);
					const progressoPackage = Math.round((contador / total) * 100);

					await atualizarPresenca({
						estado: `${mensagensApagadas} mensagens de ${totalMensagens} apagadas - [${progressoDM}%]`,
						detalhe: `Package - ${progressoPackage}% (${contador}/${total})`,
						imagemPequenaTexto: `DM ${contador}/${total}`
					});
				}
			})
			.catch(() => {});
	}

	await canal.delete().catch(() => {});

	return mensagensApagadas;
}

/**
 * Apaga mensagens usando o package do Discord
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function apagarPackage(cliente, corPrincipal) {
	UIComponents.limparTela();
	UIComponents.definirTituloJanela('BrunnoClear | Apagar package');

	atualizarPresenca({
		detalhe: 'Apagar package'
	});

	const { textoRainbow } = require('../utils/cores');

	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          APAGAR PACKAGE', corPrincipal);
	UIComponents.exibirInfo('Você precisa do pacote de dados do Discord', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        ${UIComponents.textoColorido('Como obter: Configurações > Dados e privacidade > Solicitar dados', corPrincipal, false)}`
	);
	console.log(
		`        Marque ${UIComponents.textoColorido('"Mensagens"', corPrincipal, false)} e aguarde o ZIP chegar no e-mail`
	);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Tenho o package', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Voltar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const temPackage = await solicitarTexto('');
	if (temPackage !== '1') {
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirInfo('Abrindo seletor de arquivos...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const zipPath = await selecionarArquivoZip();

	if (!zipPath) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirErroMensagem('Nenhum arquivo selecionado!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}

	if (!fs.existsSync(zipPath)) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirErroMensagem('Arquivo não encontrado!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirInfo('IDs para ignorar (separados por vírgula)', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(`        ${UIComponents.textoColorido('Exemplo:', corPrincipal, false)} 123456789, 987654321`);
	console.log(`        ${UIComponents.textoColorido('Deixe vazio para apagar TODAS as DMs', corPrincipal, false)}`);
	UIComponents.exibirLinhaVazia();

	const whitelistInput = await solicitarTexto('');
	const whitelist = whitelistInput ? whitelistInput.split(',').map((id) => id.trim()) : [];
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirInfo('Analisando package do Discord...', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        ${UIComponents.textoColorido('Isso pode demorar alguns minutos para arquivos grandes', corPrincipal, false)}`
	);
	UIComponents.exibirLinhaVazia();

	let idsUsuarios;
	try {
		idsUsuarios = await extrairIDsDoPackage(zipPath, whitelist, (totalArquivos, totalCanais, canaisDM, idsUnicos) => {
			process.stdout.write(
				`\r        ${Simbolos.carregando} Arquivos processados: ${totalArquivos} | Canais: ${totalCanais} | DMs: ${canaisDM} | IDs únicos: ${idsUnicos}   `
			);
		});

		process.stdout.write('\r' + ' '.repeat(120) + '\r');
	} catch (error) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirErroMensagem(`Erro ao processar package: ${error.message}`, corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE + 2);
		return;
	}

	if (idsUsuarios.length === 0) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
		UIComponents.exibirAviso('Nenhum usuário encontrado no package!', corPrincipal);
		UIComponents.exibirLinhaVazia();
		await sleep(CONSTANTS.DELAYS.LONG_PAUSE);
		return;
	}
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirSucesso(`${idsUsuarios.length} usuários encontrados no package`, corPrincipal);
	UIComponents.exibirLinhaVazia();

	const progressoSalvo = carregarProgresso(zipPath);
	let idsParaProcessar = idsUsuarios;
	let totalMensagensApagadas = 0;
	
	if (progressoSalvo && progressoSalvo.idsProcessados.length > 0) {
		const idsRestantes = idsUsuarios.filter(id => !progressoSalvo.idsProcessados.includes(id));
		
		UIComponents.exibirInfo(`Progresso anterior encontrado!`, corPrincipal);
		UIComponents.exibirLinhaVazia();
		console.log(`        ${UIComponents.textoColorido('Já processados:', corPrincipal, false)} ${progressoSalvo.idsProcessados.length} usuários`);
		console.log(`        ${UIComponents.textoColorido('Restantes:', corPrincipal, false)} ${idsRestantes.length} usuários`);
		console.log(`        ${UIComponents.textoColorido('Mensagens apagadas:', corPrincipal, false)} ${progressoSalvo.totalMensagensApagadas}`);
		UIComponents.exibirLinhaVazia();
		
		UIComponents.exibirOpcaoMenu('1', 'Continuar de onde parou', corPrincipal);
		UIComponents.exibirOpcaoMenu('2', 'Recomeçar do início', corPrincipal);
		UIComponents.exibirOpcaoMenu('3', 'Cancelar', corPrincipal);
		UIComponents.exibirLinhaVazia();
		
		const opcaoProgresso = await solicitarTexto('');
		
		if (opcaoProgresso === '1') {
			idsParaProcessar = idsRestantes;
			totalMensagensApagadas = progressoSalvo.totalMensagensApagadas;
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirSucesso('Continuando do progresso salvo!', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(1.5);
		} else if (opcaoProgresso === '2') {
			limparProgresso();
			UIComponents.limparTela();
			exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
			UIComponents.exibirInfo('Recomeçando do início...', corPrincipal);
			UIComponents.exibirLinhaVazia();
			await sleep(1.5);
		} else {
			return;
		}
	}
	
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirSucesso(`${idsParaProcessar.length} usuários para processar`, corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(`        ${UIComponents.textoColorido('Deseja continuar?', corPrincipal, false)}`);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Sim, apagar todas as DMs', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Não, voltar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	const confirmar = await solicitarTexto('');
	if (confirmar !== '1') {
		await sleep(2);
		return;
	}

	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

	UIComponents.exibirCabecalho('          BACKUP DAS DMs', corPrincipal);
	UIComponents.exibirInfo('Deseja fazer backup das DMs antes de apagar?', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirOpcaoMenu('1', 'Sim, fazer backup de todas as DMs', corPrincipal);
	UIComponents.exibirOpcaoMenu('2', 'Não, apenas apagar', corPrincipal);
	UIComponents.exibirLinhaVazia();

	UIComponents.exibirAviso('Backup pode demorar mais dependendo da quantidade', corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSeparador(corPrincipal);
	UIComponents.exibirLinhaVazia();

	const opcaoBackup = await solicitarTexto('');
	const fazerBackup = opcaoBackup === '1';
	let baixarAnexos = false;
	
	
	if (fazerBackup) {
		UIComponents.limparTela();
		exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);

		UIComponents.exibirCabecalho('       DOWNLOAD DE ANEXOS', corPrincipal);
		UIComponents.exibirInfo('Deseja baixar anexos localmente?', corPrincipal);
		UIComponents.exibirLinhaVazia();

		UIComponents.exibirOpcaoMenu('1', 'Sim, baixar todos os anexos', corPrincipal);
		UIComponents.exibirOpcaoMenu('2', 'Não, usar apenas URLs (podem expirar)', corPrincipal);
		UIComponents.exibirLinhaVazia();

		UIComponents.exibirAviso('Isso será aplicado a todas as DMs', corPrincipal);
		UIComponents.exibirLinhaVazia();
		UIComponents.exibirSeparador(corPrincipal);
		UIComponents.exibirLinhaVazia();

		const opcaoAnexos = await solicitarTexto('');
		baixarAnexos = opcaoAnexos === '1';
	}
	
	await sleep(2);

	let contador = 0;
	const totalUsuarios = idsParaProcessar.length;
	const idsProcessados = progressoSalvo ? [...progressoSalvo.idsProcessados] : [];

	for (const idUsuario of idsParaProcessar) {
		let canal;
		try {
			const dmData = await cliente.api.users(cliente.user.id).channels.post({
				data: {
					recipients: [idUsuario]
				}
			});
			
			canal = cliente.channels.cache.get(dmData.id);
			
			if (!canal) {
				canal = await cliente.channels.fetch(dmData.id).catch(() => null);
			}
			
			if (!canal) {
				throw new Error('Nao foi possivel obter o canal');
			}
		} catch (erro) {
			continue;
		}

		if (!canal) {
			continue;
		}
		
		contador++;
		const mensagensApagadas = await limparMensagensDM(
			cliente,
			canal,
			contador,
			totalUsuarios,
			corPrincipal,
			fazerBackup,
			baixarAnexos
		);
		totalMensagensApagadas += mensagensApagadas;
		
		idsProcessados.push(idUsuario);
		salvarProgresso(zipPath, idsProcessados, totalMensagensApagadas);
	}
	
	limparProgresso();
	
	UIComponents.limparTela();
	exibirTitulo(cliente.user.username, cliente.user.id, corPrincipal);
	UIComponents.exibirLinhaVazia();
	UIComponents.exibirSucesso('Package limpo com sucesso!', corPrincipal);
	UIComponents.exibirLinhaVazia();

	console.log(
		`        ${UIComponents.textoColorido('DMs processadas:', corPrincipal, false)} ${contador}/${idsUsuarios.length}`
	);
	console.log(
		`        ${UIComponents.textoColorido('Mensagens apagadas:', corPrincipal, false)} ${totalMensagensApagadas}`
	);

	if (fazerBackup) {
		console.log(
			`        ${UIComponents.textoColorido('Backups criados:', corPrincipal, false)} ${contador} arquivos na pasta ./backups`
		);
	}

	UIComponents.exibirLinhaVazia();
	UIComponents.exibirInfo('Pressione ENTER para voltar ao menu', corPrincipal);
	UIComponents.exibirLinhaVazia();

	await solicitarTexto('');
}

module.exports = {
	apagarPackage
};
