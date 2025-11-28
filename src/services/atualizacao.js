const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Cores, Simbolos } = require('../utils/cores');
const { sleep } = require('../utils/sleep');
const yauzl = require('yauzl');

const REPO_OWNER = 'brunnoxw';
const REPO_NAME = 'brunnoclear';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const PACKAGE_JSON_PATH = path.join(__dirname, '../../package.json');

function getUpdateDir() {
	return path.join(__dirname, '../../.update');
}

const GITHUB_TOKEN = null;

/**
 * Obtém headers para requisições ao GitHub
 */
function obterHeadersGitHub() {
	const headers = {
		'User-Agent': 'BrunnoClear-Updater',
		Accept: 'application/vnd.github+json'
	};

	if (
		GITHUB_TOKEN &&
		GITHUB_TOKEN !== null &&
		GITHUB_TOKEN !== 'null' &&
		GITHUB_TOKEN !== 'ghp_seu_token_aqui' &&
		GITHUB_TOKEN.trim() !== ''
	) {
		headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
	}

	return headers;
}

/**
 * Faz requisição HTTPS e retorna JSON
 */
function httpsGetJSON(url) {
	return new Promise((resolve, reject) => {
		const options = {
			headers: obterHeadersGitHub()
		};

		https
			.get(url, options, (res) => {
				if (res.statusCode === 401) {
					reject(new Error('Token do GitHub inválido ou expirado'));
					return;
				}

				if (res.statusCode === 404) {
					reject(
						new Error(
							'Repositório ou release não encontrado. Verifique se o repositório é privado e se o token tem permissões corretas.'
						)
					);
					return;
				}

				if (res.statusCode === 403) {
					const resetTime = res.headers['x-ratelimit-reset'];
					if (resetTime) {
						const resetDate = new Date(resetTime * 1000);
						reject(
							new Error(
								`Limite de requisições do GitHub excedido. Tente novamente após ${resetDate.toLocaleString('pt-BR')}`
							)
						);
					} else {
						reject(new Error('Acesso negado pelo GitHub. Verifique suas permissões.'));
					}
					return;
				}

				let data = '';

				res.on('data', (chunk) => {
					data += chunk;
				});

				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						reject(new Error('Erro ao processar JSON'));
					}
				});
			})
			.on('error', (err) => {
				reject(err);
			});
	});
}

/**
 * Baixa arquivo de uma URL (sem autenticação para URLs públicas)
 */
function downloadFile(url, destPath) {
	return new Promise((resolve, reject) => {
		const makeRequest = (requestUrl, fileStream = null) => {
			const isGitHubAPI = requestUrl.includes('api.github.com');
			const headers = isGitHubAPI ? obterHeadersGitHub() : { 'User-Agent': 'BrunnoClear-Updater' };

			https
				.get(
					requestUrl,
					{
						headers: headers,
						followRedirect: true
					},
					(response) => {
						if (response.statusCode === 302 || response.statusCode === 301) {
							if (fileStream) {
								fileStream.destroy();
							}
							return makeRequest(response.headers.location, null);
						}

						if (response.statusCode !== 200) {
							if (fileStream) {
								fileStream.destroy();
							}
							if (fs.existsSync(destPath)) {
								fs.unlinkSync(destPath);
							}
							reject(new Error(`Erro ao baixar: HTTP ${response.statusCode}`));
							return;
						}

						if (fs.existsSync(destPath)) {
							fs.unlinkSync(destPath);
						}
						const file = fs.createWriteStream(destPath);

						let downloadedSize = 0;
						const totalSize = parseInt(response.headers['content-length'], 10);

						response.on('data', (chunk) => {
							downloadedSize += chunk.length;

							if (totalSize && !isNaN(totalSize)) {
								const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
								const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2);
								const totalMB = (totalSize / 1024 / 1024).toFixed(2);
								process.stdout.write(`\r${Simbolos.info} Baixando... ${percent}% (${downloadedMB} MB / ${totalMB} MB)`);
							} else {
								const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(2);
								process.stdout.write(`\r${Simbolos.info} Baixando... ${downloadedMB} MB`);
							}
						});

						response.pipe(file);

						file.on('finish', () => {
							file.close(() => {
								console.log('\n');
								resolve();
							});
						});

						file.on('error', (err) => {
							file.destroy();
							fs.unlink(destPath, () => {});
							reject(err);
						});

						response.on('error', (err) => {
							file.destroy();
							fs.unlink(destPath, () => {});
							reject(err);
						});
					}
				)
				.on('error', (err) => {
					if (fileStream) {
						fileStream.destroy();
					}
					fs.unlink(destPath, () => {});
					reject(err);
				});
		};

		makeRequest(url, null);
	});
}

/**
 * Extrai arquivo ZIP usando yauzl
 */
function extrairComYauzl(zipPath, extractPath) {
	return new Promise((resolve, reject) => {
		console.log(`${Simbolos.info} Abrindo arquivo ZIP: ${zipPath}`);

		if (!fs.existsSync(zipPath)) {
			reject(new Error('Arquivo ZIP não encontrado'));
			return;
		}

		console.log(`${Simbolos.sucesso} Arquivo encontrado!`);
		console.log(`${Simbolos.info} Chamando yauzl.open...`);

		const timeout = setTimeout(() => {
			console.error(`${Simbolos.erro} Timeout após 30 segundos esperando yauzl.open`);
			reject(new Error('Timeout ao abrir arquivo ZIP'));
		}, 30000);

		yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
			clearTimeout(timeout);

			if (err) {
				console.error(`${Simbolos.erro} Erro ao abrir ZIP: ${err.message}`);
				reject(err);
				return;
			}

			console.log(`${Simbolos.sucesso} ZIP aberto! Total de entradas: ${zipfile.entryCount}`);

			let filesExtracted = 0;
			let totalEntries = zipfile.entryCount;
			let hasError = false;

			zipfile.on('error', (err) => {
				if (hasError) return;
				hasError = true;
				console.error(`${Simbolos.erro} Erro no zipfile: ${err.message}`);
				reject(err);
			});

			zipfile.on('end', () => {
				if (hasError) return;
				console.log('');
				console.log(`${Simbolos.sucesso} Extração finalizada! ${filesExtracted} itens extraídos.`);
				resolve();
			});

			zipfile.on('entry', (entry) => {
				if (hasError) return;

				const outputPath = path.join(extractPath, entry.fileName);

				if (/\/$/.test(entry.fileName)) {
					try {
						fs.mkdirSync(outputPath, { recursive: true });
						filesExtracted++;
						const progress = ((filesExtracted / totalEntries) * 100).toFixed(1);
						process.stdout.write(`\r${Simbolos.info} Extraindo... ${progress}% (${filesExtracted}/${totalEntries})`);
						zipfile.readEntry();
					} catch (err) {
						if (hasError) return;
						hasError = true;
						console.error(`${Simbolos.erro} Erro ao criar diretório: ${err.message}`);
						reject(err);
					}
				} else {
					try {
						fs.mkdirSync(path.dirname(outputPath), { recursive: true });
					} catch (err) {
						if (hasError) return;
						hasError = true;
						console.error(`${Simbolos.erro} Erro ao criar diretório pai: ${err.message}`);
						reject(err);
						return;
					}

					zipfile.openReadStream(entry, (err, readStream) => {
						if (hasError) return;

						if (err) {
							hasError = true;
							console.error(`${Simbolos.erro} Erro ao abrir stream: ${err.message}`);
							reject(err);
							return;
						}

						const writeStream = fs.createWriteStream(outputPath);

						readStream.on('error', (err) => {
							if (hasError) return;
							hasError = true;
							writeStream.destroy();
							console.error(`${Simbolos.erro} Erro ao ler stream: ${err.message}`);
							reject(err);
						});

						writeStream.on('error', (err) => {
							if (hasError) return;
							hasError = true;
							readStream.destroy();
							console.error(`${Simbolos.erro} Erro ao escrever arquivo: ${err.message}`);
							reject(err);
						});

						writeStream.on('close', () => {
							if (hasError) return;
							filesExtracted++;
							const progress = ((filesExtracted / totalEntries) * 100).toFixed(1);
							process.stdout.write(`\r${Simbolos.info} Extraindo... ${progress}% (${filesExtracted}/${totalEntries})`);
							zipfile.readEntry();
						});

						readStream.pipe(writeStream);
					});
				}
			});

			zipfile.readEntry();
		});
	});
}

/**
 * Compara versões (semver)
 */
function compararVersoes(versaoAtual, versaoNova) {
	const limparVersao = (versao) => {
		const limpa = String(versao)
			.replace(/^[^\d]+/, '')
			.replace(/[^\d.]/g, '')
			.replace(/\.+/g, '.')
			.replace(/^\./, '')
			.replace(/\.$/, '');

		return limpa
			.split('.')
			.filter((n) => n !== '')
			.map((n) => parseInt(n, 10) || 0);
	};

	const v1 = limparVersao(versaoAtual);
	const v2 = limparVersao(versaoNova);

	const maxLen = Math.max(v1.length, v2.length);

	for (let i = 0; i < maxLen; i++) {
		const num1 = v1[i] || 0;
		const num2 = v2[i] || 0;

		if (num2 > num1) return 1;
		if (num2 < num1) return -1;
	}

	return 0;
}

/**
 * Obtém versão atual do package.json
 */
function obterVersaoAtual() {
	try {
		const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
		return packageData.version;
	} catch (error) {
		console.error(`${Simbolos.erro} Erro ao ler package.json:`, error.message);
		return '0.0.0';
	}
}

/**
 * Verifica se há atualizações disponíveis
 */
async function verificarAtualizacao(silencioso = false) {
	try {
		if (!silencioso) {
			console.log(`\n${Simbolos.carregando} Verificando atualizações no GitHub...`);
		}
		const releaseData = await httpsGetJSON(API_URL);
		const versaoAtual = obterVersaoAtual();
		const versaoNova = releaseData.tag_name
			.replace(/^[^\d]+/, '')
			.replace(/[^\d.]/g, '')
			.replace(/\.+/g, '.')
			.replace(/^\./, '')
			.replace(/\.$/, '');

		const resultado = compararVersoes(versaoAtual, versaoNova);

		if (resultado > 0) {
			return {
				disponivel: true,
				versaoAtual,
				versaoNova,
				changelog: releaseData.body || 'Sem descrição',
				downloadUrl: releaseData.zipball_url,
				htmlUrl: releaseData.html_url,
				publicadoEm: releaseData.published_at
			};
		}

		if (!silencioso) {
			console.log(`${Simbolos.sucesso} Você já está usando a versão mais recente! (v${versaoAtual})`);
		}
		return {
			disponivel: false,
			versaoAtual
		};
	} catch (error) {
		if (!silencioso) {
			console.error(`${Simbolos.erro} Erro ao verificar atualizações:`, error.message);
		}
		return {
			disponivel: false,
			versaoAtual: obterVersaoAtual(),
			erro: error.message
		};
	}
}

/**
 * Exibe informações sobre a atualização
 */
function exibirInfoAtualizacao(info) {
	const corPrincipal = Cores.principal();
	const reset = Cores.reset;

	console.log('\n' + corPrincipal + '═'.repeat(60) + reset);
	console.log(corPrincipal + '  📦 NOVA VERSÃO DISPONÍVEL!' + reset);
	console.log(corPrincipal + '═'.repeat(60) + reset);
	console.log(`\n  ${Simbolos.info} Versão atual: ${Cores.vermelho}v${info.versaoAtual}${reset}`);
	console.log(`  ${Simbolos.sucesso} Nova versão:  ${Cores.verde}v${info.versaoNova}${reset}`);

	try {
		const dataPublicacao = new Date(info.publicadoEm);
		console.log(`  ${Simbolos.info} Publicado em: ${dataPublicacao.toLocaleString('pt-BR')}`);
	} catch (e) {
		console.log(`  ${Simbolos.info} Publicado em: ${info.publicadoEm}`);
	}

	console.log(`\n${corPrincipal}  📝 Mudanças:${reset}`);
	console.log('  ' + corPrincipal + '─'.repeat(58) + reset);

	const linhas = info.changelog.split('\n').slice(0, 10);
	linhas.forEach((linha) => {
		if (linha.trim()) {
			console.log(`  ${linha}`);
		}
	});

	console.log('\n' + corPrincipal + '═'.repeat(60) + reset);
}

/**
 * Baixa e instala a atualização
 */
async function instalarAtualizacao(info) {
	try {
		console.log(`\n${Simbolos.carregando} Iniciando processo de atualização...\n`);

		const UPDATE_DIR = getUpdateDir();
		if (!fs.existsSync(UPDATE_DIR)) {
			fs.mkdirSync(UPDATE_DIR, { recursive: true });
		}

		const zipPath = path.join(UPDATE_DIR, 'update.zip');
		const extractPath = path.join(UPDATE_DIR, 'extracted');

		console.log(`${Simbolos.download} Baixando versão ${info.versaoNova}...`);
		await downloadFile(info.downloadUrl, zipPath);
		console.log(`${Simbolos.sucesso} Download concluído!`);

		if (!fs.existsSync(zipPath)) {
			throw new Error('Arquivo ZIP não foi baixado');
		}
		const zipStats = fs.statSync(zipPath);
		console.log(`${Simbolos.info} Tamanho do arquivo: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);

		console.log(`\n${Simbolos.carregando} Extraindo arquivos...`);
		await sleep(1);

		if (fs.existsSync(extractPath)) {
			fs.rmSync(extractPath, { recursive: true, force: true });
		}
		fs.mkdirSync(extractPath, { recursive: true });

		console.log(`${Simbolos.info} Iniciando extração com yauzl...`);
		console.log(`${Simbolos.info} Caminho do ZIP: ${zipPath}`);
		console.log(`${Simbolos.info} Caminho de destino: ${extractPath}`);

		try {
			await extrairComYauzl(zipPath, extractPath);
			console.log(`${Simbolos.sucesso} Arquivos extraídos com sucesso!`);
		} catch (errorExtract) {
			console.error(`${Simbolos.erro} Erro na extração: ${errorExtract.message}`);
			console.error(`${Simbolos.erro} Stack: ${errorExtract.stack}`);
			throw new Error(`Erro ao extrair: ${errorExtract.message}`);
		}

		const extractedDirs = fs.readdirSync(extractPath);
		console.log(`${Simbolos.info} Diretórios extraídos: ${extractedDirs.length}`);

		if (extractedDirs.length === 0) {
			throw new Error('Nenhum arquivo foi extraído do ZIP');
		}

		const rootDir = path.join(extractPath, extractedDirs[0]);
		console.log(`${Simbolos.info} Diretório raiz: ${extractedDirs[0]}`);

		console.log(`\n${Simbolos.carregando} Instalando arquivos...`);

		const excluirItens = ['node_modules', '.git', 'config.json', '.update', 'dist'];
		copiarDiretorioRecursivo(rootDir, process.cwd(), excluirItens);

		console.log(`${Simbolos.sucesso} Arquivos instalados com sucesso!`);

		const packagePath = path.join(process.cwd(), 'package.json');
		const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
		packageData.version = info.versaoNova;
		fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));

		console.log(`\n${Simbolos.carregando} Instalando dependências...`);
		try {
			execSync('npm install --production', {
				stdio: 'inherit',
				cwd: process.cwd()
			});
			console.log(`${Simbolos.sucesso} Dependências instaladas com sucesso!`);
		} catch (error) {
			console.log(`${Simbolos.aviso} Aviso: Erro ao instalar dependências automaticamente`);
			console.log(`Execute 'npm install' manualmente após a atualização.`);
		}

		console.log(`\n${Simbolos.carregando} Limpando arquivos temporários...`);
		fs.rmSync(UPDATE_DIR, { recursive: true, force: true });
		console.log(`${Simbolos.sucesso} Limpeza concluída!`);

		const corVerde = Cores.verde;
		const reset = Cores.reset;
		console.log(`\n${corVerde}${'═'.repeat(60)}${reset}`);
		console.log(`${corVerde}  ✨ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO! ✨${reset}`);
		console.log(`${corVerde}  📦 Versão ${info.versaoNova} instalada!${reset}`);
		console.log(`${corVerde}${'═'.repeat(60)}${reset}`);

		return true;
	} catch (error) {
		console.error(`\n${Simbolos.erro} Erro durante a atualização:`, error.message);
		console.log(`${Simbolos.aviso} Tente atualizar manualmente em: ${info.htmlUrl}`);

		try {
			const UPDATE_DIR = getUpdateDir();
			if (fs.existsSync(UPDATE_DIR)) {
				fs.rmSync(UPDATE_DIR, { recursive: true, force: true });
			}
		} catch (cleanupError) {}

		return false;
	}
}

/**
 * Copia diretório recursivamente
 */
function copiarDiretorioRecursivo(origem, destino, excluir = []) {
	if (!fs.existsSync(destino)) {
		fs.mkdirSync(destino, { recursive: true });
	}

	const items = fs.readdirSync(origem);

	for (const item of items) {
		if (excluir.includes(item)) continue;

		const origemPath = path.join(origem, item);
		const destinoPath = path.join(destino, item);

		const stats = fs.statSync(origemPath);

		if (stats.isDirectory()) {
			copiarDiretorioRecursivo(origemPath, destinoPath, excluir);
		} else {
			fs.copyFileSync(origemPath, destinoPath);
		}
	}
}

/**
 * Verifica atualizações ao iniciar (silencioso)
 */
async function verificarAtualizacaoInicio() {
	try {
		const info = await verificarAtualizacao(true);

		if (info && info.disponivel) {
			const corPrincipal = Cores.principal();
			const reset = Cores.reset;
			console.log(`\n${corPrincipal}${'─'.repeat(60)}${reset}`);
			console.log(
				`${Simbolos.info} ${corPrincipal}Nova versão disponível:${reset} ${Cores.vermelho}v${info.versaoAtual}${reset} → ${Cores.verde}v${info.versaoNova}${reset}`
			);
			console.log(`${Simbolos.dica} Digite '${corPrincipal}!update${reset}' no menu para atualizar`);
			console.log(`${corPrincipal}${'─'.repeat(60)}${reset}\n`);
		}
	} catch (error) {}
}

/**
 * Menu interativo de atualização
 */
async function menuAtualizacao() {
	console.clear();

	const info = await verificarAtualizacao(false);
	if (!info || info.erro) {
		console.log(`\n${Simbolos.erro} Não foi possível verificar atualizações.`);
		console.log(`${Simbolos.dica} Verifique sua conexão com a internet.\n`);
		await sleep(2);
		return false;
	}

	if (!info.disponivel) {
		await sleep(2);
		return false;
	}

	exibirInfoAtualizacao(info);

	const readlineSync = require('readline-sync');
	const resposta = readlineSync.question(`\n${Simbolos.pergunta} Deseja instalar a atualização? (S/n): `);

	if (resposta.toLowerCase() === 's' || resposta === '') {
		const sucesso = await instalarAtualizacao(info);
		if (sucesso) {
			console.log(`\n${Simbolos.info} Pressione ENTER para reiniciar o programa...`);
			readlineSync.question('');
			await sleep(1);
			process.exit(0);
		}
	} else {
		console.log(`\n${Simbolos.info} Atualização cancelada.`);
		console.log(`${Simbolos.dica} Você pode atualizar manualmente em: ${info.htmlUrl}\n`);
	}

	await sleep(2);
	return false;
}

module.exports = {
	verificarAtualizacao,
	instalarAtualizacao,
	menuAtualizacao,
	verificarAtualizacaoInicio,
	obterVersaoAtual
};
