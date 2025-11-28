const RPC = require('discord-rpc');
const { obterConfig } = require('../config/configuracao');
const { version } = require('../../package.json');

let clienteRPC = null;
let rpcAtivo = false;

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
function obterTemaRPC() {
	const config = obterConfig();

	return {
		nome: config.rpc.nome || 'BrunnoClear',
		estado: config.rpc.estado || `v${version}`,
		detalhe: config.rpc.detalhe || 'No menu principal',
		imagemGrande: config.rpc.url_imagem || 'https://i.imgur.com/uTql7fj.jpeg',
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
		const tema = obterTemaRPC();
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
