const RPC = require('discord-rpc');
const https = require('https');
const { obterConfig } = require('../config/configuracao');
const { version } = require('../../package.json');

let clienteRPC = null;
let rpcAtivo = false;
let iconeAplicacaoCache = null;
let ultimoIdAplicacao = null; // Rastreia o último ID da aplicação

/**
 * Busca o ícone da aplicação Discord
 */
async function buscarIconeAplicacao(appId) {
	return new Promise((resolve) => {
		const url = `https://discord.com/api/v10/applications/${appId}/rpc`;

		const req = https.get(
			url,
			{
				headers: {
					'User-Agent': 'BrunnoClear-RPC/1.0'
				},
				timeout: 3000
			},
			(res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					try {
						if (res.statusCode === 200) {
							const appData = JSON.parse(data);
							if (appData.icon) {
								const icone = `https://cdn.discordapp.com/app-icons/${appId}/${appData.icon}.png`;
								resolve(icone);
							} else {
								resolve('https://i.imgur.com/uTql7fj.jpeg');
							}
						} else {
							resolve('https://i.imgur.com/uTql7fj.jpeg');
						}
					} catch (e) {
						resolve('https://i.imgur.com/uTql7fj.jpeg');
					}
				});
			}
		);

		req.on('error', () => resolve('https://i.imgur.com/uTql7fj.jpeg'));
		req.on('timeout', () => {
			req.destroy();
			resolve('https://i.imgur.com/uTql7fj.jpeg');
		});
	});
}

/**
 * Inicializa o Rich Presence do Discord
 */
async function inicializarRPC() {
	const config = obterConfig();

	if (config.desativar_rpc) {
		return false;
	}

	try {
		const idCliente = config.rpc.id_aplicacao || '1441501260984356907';
		clienteRPC = new RPC.Client({ transport: 'ipc' });

		RPC.register(idCliente);
		await clienteRPC.login({ clientId: idCliente });

		iconeAplicacaoCache = null;

		rpcAtivo = true;
		return true;
	} catch (erro) {
		console.error('Erro ao inicializar RPC:', erro.message);
		rpcAtivo = false;
		return false;
	}
}

/**
 * Obtém o tema atual do RPC
 */
async function obterTemaRPC() {
	const config = obterConfig();
	const idAplicacao = config.rpc.id_aplicacao || '1441501260984356907';
	
	let imagemGrande = config.rpc.url_imagem;
	
	if (!imagemGrande || imagemGrande.trim() === '') {
		if (ultimoIdAplicacao !== idAplicacao) {
			iconeAplicacaoCache = null;
			ultimoIdAplicacao = idAplicacao;
		}
		
		if (iconeAplicacaoCache) {
			imagemGrande = iconeAplicacaoCache;
		} else {
			iconeAplicacaoCache = await buscarIconeAplicacao(idAplicacao);
			imagemGrande = iconeAplicacaoCache;
		}
	}

	return {
		nome: config.rpc.nome || 'BrunnoClear',
		estado: config.rpc.estado || `v${version}`,
		detalhe: config.rpc.detalhe || 'No menu principal',
		imagemGrande: imagemGrande || 'https://i.imgur.com/uTql7fj.jpeg',
		textoBotao: config.rpc.texto_botao,
		urlBotao: config.rpc.url_botao
	};
}

/**
 * Atualiza o Rich Presence
 * @param {Object} presenca - Dados da presença
 */
async function atualizarPresenca(presenca = {}) {
	if (!clienteRPC || !rpcAtivo) {
		return;
	}

	const config = obterConfig();
	if (config.desativar_rpc) {
		return;
	}
	try {
		const tema = await obterTemaRPC();
		const atividade = {
			state: presenca.estado || tema.estado || `v${version}`,
			details: presenca.detalhe || tema.detalhe,
			largeImageKey: presenca.imagemGrande || tema.imagemGrande,
			largeImageText: presenca.textoImagemGrande || tema.nome,
			smallImageKey: presenca.imagemPequena,
			smallImageText: presenca.textoImagemPequena,
			...(tema.textoBotao && tema.urlBotao ? { buttons: [{ label: tema.textoBotao, url: tema.urlBotao }] } : {})
		};

		await clienteRPC.setActivity(atividade);
	} catch (erro) {}
}

/**
 * Desconecta o RPC
 */
async function desconectarRPC() {
	if (clienteRPC && rpcAtivo) {
		try {
			await clienteRPC.destroy();
			rpcAtivo = false;
		} catch (erro) {
			console.error('Erro ao desconectar RPC:', erro.message);
		}
	}
}

module.exports = {
	inicializarRPC,
	atualizarPresenca,
	desconectarRPC,
	obterTemaRPC
};
