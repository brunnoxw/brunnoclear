const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const PORTA_INICIAL = 3147;
const HOST = '127.0.0.1';
const MAX_TENTATIVAS = 10;

const config_arquivo = path.join(process.cwd(), 'config.json');
const html_arquivo = path.join(__dirname, '..', 'ui', 'rpc-config.html');

/**
 * Lê a configuração atual
 */
const lerConfig = () => {
	try {
		return JSON.parse(fs.readFileSync(config_arquivo, 'utf8'));
	} catch (e) {
		return { rpc: {} };
	}
};

/**
 * Salva a configuração
 */
const salvarConfig = (config) => {
	fs.writeFileSync(config_arquivo, JSON.stringify(config, null, 2));
};

/**
 * Busca informações da aplicação Discord
 */
async function buscarInfoDiscord(appId) {
	return new Promise((resolve) => {
		const url = `https://discord.com/api/v10/applications/${appId}/rpc`;

		const req = https.get(
			url,
			{
				headers: {
					'User-Agent': 'BrunnoClear-RPC/1.0'
				},
				timeout: 5000
			},
			(res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					try {
						if (res.statusCode === 200) {
							const appData = JSON.parse(data);
							const icone = appData.icon
								? `https://cdn.discordapp.com/app-icons/${appId}/${appData.icon}.png?size=2048`
								: null;

							resolve({
								sucesso: true,
								nome: appData.name,
								icone: icone
							});
						} else {
							resolve({ sucesso: false });
						}
					} catch (e) {
						resolve({ sucesso: false });
					}
				});
			}
		);

		req.on('error', () => resolve({ sucesso: false }));
		req.on('timeout', () => {
			req.destroy();
			resolve({ sucesso: false });
		});
	});
}

/**
 * Abre o navegador
 */
const abrirNavegador = (url) => {
	const platform = process.platform;
	let comando;

	if (platform === 'win32') {
		comando = `start "" "${url}"`;
	} else if (platform === 'darwin') {
		comando = `open "${url}"`;
	} else {
		comando = `xdg-open "${url}"`;
	}

	exec(comando, (erro) => {
		if (erro) {
			console.log(`[RPC-SERVER] Erro ao abrir navegador: ${erro.message}`);
		}
	});
};

/**
 * Verifica se uma porta está disponível
 */
function verificarPortaDisponivel(porta) {
	return new Promise((resolve) => {
		const testServer = http.createServer();

		testServer.once('error', () => resolve(false));
		testServer.once('listening', () => {
			testServer.close();
			resolve(true);
		});

		testServer.listen(porta, HOST);
	});
}

/**
 * Encontra uma porta disponível
 */
async function encontrarPortaDisponivel() {
	for (let i = 0; i < MAX_TENTATIVAS; i++) {
		const porta = PORTA_INICIAL + i;
		const disponivel = await verificarPortaDisponivel(porta);
		if (disponivel) {
			return porta;
		}
	}
	throw new Error('Nenhuma porta disponível encontrada');
}

/**
 * Cria o servidor HTTP
 */
function criarServidor(porta, host) {
	const server = http.createServer(async (req, res) => {
		const timestamp = new Date().toISOString();
		console.log(`[RPC-SERVER ${timestamp}] ${req.method} ${req.url}`);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			res.end();
			return;
		}

		if (req.method === 'GET' && req.url === '/') {
			try {
				const html = fs.readFileSync(html_arquivo, 'utf8');
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(html);
				console.log(`[RPC-SERVER] ✅ HTML servido`);
			} catch (erro) {
				console.error(`[RPC-SERVER] ❌ Erro ao servir HTML:`, erro);
				res.writeHead(500, { 'Content-Type': 'text/plain' });
				res.end('Erro interno do servidor');
			}
			return;
		}

		if (req.method === 'GET' && req.url === '/api/config') {
			try {
				const config = lerConfig();
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(config));
				console.log(`[RPC-SERVER] ✅ Configuração enviada`);
			} catch (erro) {
				console.error(`[RPC-SERVER] ❌ Erro ao carregar configuração:`, erro);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ erro: 'Erro ao carregar configuração' }));
			}
			return;
		}

		if (req.method === 'POST' && req.url === '/api/config') {
			let body = '';
			req.on('data', (chunk) => (body += chunk.toString()));
			req.on('end', () => {
				try {
					const novaConfig = JSON.parse(body);
					const configAtual = lerConfig();

					configAtual.rpc = {
						id_aplicacao: novaConfig.id_aplicacao || '',
						nome: novaConfig.nome || '',
						detalhe: novaConfig.detalhe || '',
						estado: novaConfig.estado || '',
						url_imagem: novaConfig.url_imagem || '',
						botoes: novaConfig.botoes || []
					};

					salvarConfig(configAtual);

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ sucesso: true, mensagem: 'Configuração salva!' }));
					console.log(`[RPC-SERVER] ✅ Configuração salva`);
				} catch (erro) {
					console.error(`[RPC-SERVER] ❌ Erro ao salvar:`, erro);
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ sucesso: false, mensagem: 'JSON inválido' }));
				}
			});
			return;
		}

		if (req.method === 'GET' && req.url.startsWith('/api/discord-app/')) {
			const appId = req.url.split('/').pop();
			try {
				const resultado = await buscarInfoDiscord(appId);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(resultado));
				console.log(`[RPC-SERVER] ✅ Info da app Discord enviada`);
			} catch (erro) {
				console.error(`[RPC-SERVER] ❌ Erro ao buscar app Discord:`, erro);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ sucesso: false }));
			}
			return;
		}
		if (req.method === 'POST' && req.url === '/api/toggle-rpc') {
			try {
				const config = lerConfig();
				config.desativar_rpc = !config.desativar_rpc;
				salvarConfig(config);

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						sucesso: true,
						ativo: !config.desativar_rpc
					})
				);
				console.log(`[RPC-SERVER] ✅ RPC toggle: ${!config.desativar_rpc ? 'ativo' : 'desativo'}`);
			} catch (erro) {
				console.error(`[RPC-SERVER] ❌ Erro no toggle RPC:`, erro);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ sucesso: false }));
			}
			return;
		}

		if (req.method === 'GET' && req.url.startsWith('/api/proxy-image?url=')) {
			const imageUrl = decodeURIComponent(req.url.split('url=')[1]);

			if (!imageUrl.includes('cdn.discordapp.com') && !imageUrl.includes('cdn.discord.com')) {
				res.writeHead(403, { 'Content-Type': 'text/plain' });
				res.end('URL não permitida');
				return;
			}

			try {
				https
					.get(imageUrl, (proxyRes) => {
						const headers = {
							'Content-Type': proxyRes.headers['content-type'] || 'image/png',
							'Cache-Control': 'public, max-age=31536000',
							'Access-Control-Allow-Origin': '*'
						};

						res.writeHead(proxyRes.statusCode, headers);
						proxyRes.pipe(res);
					})
					.on('error', (erro) => {
						console.error(`[RPC-SERVER] ❌ Erro ao fazer proxy da imagem:`, erro);
						res.writeHead(500, { 'Content-Type': 'text/plain' });
						res.end('Erro ao carregar imagem');
					});
			} catch (erro) {
				console.error(`[RPC-SERVER] ❌ Erro no proxy:`, erro);
				res.writeHead(500, { 'Content-Type': 'text/plain' });
				res.end('Erro ao processar requisição');
			}
			return;
		}

		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Não encontrado');
	});

	server.on('error', (err) => {
		if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
			console.log(`[RPC-SERVER] ⚠️ Porta ${porta} ocupada, tentando próxima...`);

			encontrarPortaDisponivel()
				.then((novaPorta) => {
					const novoServer = criarServidor(novaPorta, host);
					novoServer.listen(novaPorta, host, () => {
						const url = `http://${host}:${novaPorta}`;
						console.log(`[RPC-SERVER] ✅ Servidor iniciado em: ${url}`);
						abrirNavegador(url);
					});
				})
				.catch((erro) => {
					console.error(`[RPC-SERVER] ❌ Erro fatal:`, erro);
					process.exit(1);
				});
		} else {
			console.error(`[RPC-SERVER] ❌ Erro no servidor:`, err);
			process.exit(1);
		}
	});

	return server;
}

/**
 * Iniciar servidor
 */


async function iniciar() {
	try {
		console.log(`[RPC-SERVER] 🚀 Iniciando servidor...`);

		const porta = await encontrarPortaDisponivel();
		const server = criarServidor(porta, HOST);

		server.listen(porta, HOST, () => {
			const url = `http://${HOST}:${porta}`;
			console.log(`[RPC-SERVER] ✅ Servidor iniciado em: ${url}`);
			abrirNavegador(url);
		});
	} catch (erro) {
		console.error(`[RPC-SERVER] ❌ Erro ao iniciar:`, erro);
		process.exit(1);
	}
}

if (require.main === module) {
	iniciar();
}

module.exports = { iniciar };
